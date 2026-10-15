import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import Clientes from "../src/pages/Clientes"
import { ToastProvider } from "../src/components/ToastContext"
import * as clientApi from "../src/api/client"

vi.mock("../src/api/client")

describe("Flujo representativo de creación y visualización de registros con API mockeada", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("permite registrar un nuevo cliente y visualizarlo inmediatamente en el listado", async () => {
    const initialClients = [
      {
        id: 1,
        nombre: "Cliente Inicial Uno",
        contacto: "Ana Pérez",
        telefono: "+57 300 111 2222",
        email: "ana@cliente.invalid",
        active: 1,
        createdAt: "2026-10-01T10:00:00.000Z"
      }
    ]

    const updatedClients = [
      ...initialClients,
      {
        id: 2,
        nombre: "Comercializadora Pacífico S.A.S.",
        contacto: "Carlos Gómez",
        telefono: "+57 311 999 8888",
        email: "contacto@pacifico.invalid",
        active: 1,
        createdAt: "2026-10-12T15:00:00.000Z"
      }
    ]

    // Primera llamada retorna 1 cliente; la siguiente retorna los 2
    clientApi.getClientesPaged
      .mockResolvedValueOnce({ items: initialClients, total: 1 })
      .mockResolvedValueOnce({ items: updatedClients, total: 2 })
    clientApi.getProductos.mockResolvedValue([])
    clientApi.createCliente.mockResolvedValue({ id: 2 })

    render(
      <ToastProvider>
        <Clientes token="auth-test-token" />
      </ToastProvider>
    )

    // 1. Verificar cliente inicial presente
    expect(await screen.findByText("Cliente Inicial Uno")).toBeTruthy()

    // 2. Abrir modal de nuevo cliente
    const nuevoBtn = screen.getByRole("button", { name: /Nuevo Cliente/i })
    fireEvent.click(nuevoBtn)

    // 3. Completar campos del formulario
    const nameInput = screen.getByLabelText(/Nombre \/ Razón Social/i)
    fireEvent.change(nameInput, { target: { value: "Comercializadora Pacífico S.A.S." } })

    const contactInput = screen.getByLabelText(/Persona de Contacto/i)
    fireEvent.change(contactInput, { target: { value: "Carlos Gómez" } })

    const emailInput = screen.getByLabelText(/^Email$/i)
    fireEvent.change(emailInput, { target: { value: "contacto@pacifico.invalid" } })

    const phoneInput = screen.getByLabelText(/Teléfono/i)
    fireEvent.change(phoneInput, { target: { value: "+57 311 999 8888" } })

    // 4. Enviar formulario
    const submitBtn = screen.getByRole("button", { name: /Crear Cliente/i })
    fireEvent.click(submitBtn)

    // 5. Verificar que se haya llamado la API con el payload esperado
    await waitFor(() => {
      expect(clientApi.createCliente).toHaveBeenCalledWith(
        "auth-test-token",
        expect.objectContaining({
          nombre: "Comercializadora Pacífico S.A.S.",
          contacto: "Carlos Gómez",
          email: "contacto@pacifico.invalid",
          telefono: "+57 311 999 8888"
        })
      )
    })

    // 6. Verificar feedback de éxito y visualización del nuevo registro
    await waitFor(() => {
      expect(screen.getByText("Cliente creado exitosamente")).toBeTruthy()
      expect(screen.getByText("Comercializadora Pacífico S.A.S.")).toBeTruthy()
    })
  })
})
