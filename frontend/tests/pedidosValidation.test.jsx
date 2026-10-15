import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import Pedidos from "../src/pages/Pedidos"
import { ToastProvider } from "../src/components/ToastContext"
import * as clientApi from "../src/api/client"

vi.mock("../src/api/client")

describe("Validaciones visibles en formulario de pedidos y control de stock", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  const mockClientes = [{ id: 1, nombre: "Distribuidora Andina S.A.", activo: true, precioPersonalizado: null }]

  const mockProductos = [{ id: 10, nombre: "Caja Premium Especial", precioMinimo: 50000, stockActual: 5 }]

  const mockOptions = {
    payments: ["Efectivo", "Transferencia"],
    orderStates: ["Pendiente", "Completado"]
  }

  function renderPedidos() {
    clientApi.getClientes.mockResolvedValue(mockClientes)
    clientApi.getProductos.mockResolvedValue(mockProductos)
    clientApi.getPedidosFiltered.mockResolvedValue([])
    clientApi.getOptions.mockResolvedValue(mockOptions)
    clientApi.getClientPrices.mockResolvedValue([])

    return render(
      <ToastProvider>
        <Pedidos token="valid-jwt" />
      </ToastProvider>
    )
  }

  it("alerta al usuario con notificación visible si intenta crear un pedido sin seleccionar cliente", async () => {
    renderPedidos()

    // Abrir modal de nuevo pedido
    const newBtn = await screen.findByRole("button", { name: /Nuevo Pedido/i })
    fireEvent.click(newBtn)

    // Intentar guardar directamente sin cliente
    const submitBtn = screen.getByRole("button", { name: /Crear Pedido/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/Por favor selecciona un cliente/i)).toBeTruthy()
    })
    expect(clientApi.createPedido).not.toHaveBeenCalled()
  })

  it("alerta al usuario con advertencia si el pedido no incluye productos con cantidad válida", async () => {
    renderPedidos()

    const newBtn = await screen.findByRole("button", { name: /Nuevo Pedido/i })
    fireEvent.click(newBtn)

    // Seleccionar cliente
    const clientSelect = screen.getByLabelText(/Cliente/i)
    fireEvent.change(clientSelect, { target: { value: "1" } })

    // Intentar enviar sin producto seleccionado o cantidad > 0
    const submitBtn = screen.getByRole("button", { name: /Crear Pedido/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/Por favor agrega al menos un producto válido al pedido/i)).toBeTruthy()
    })
    expect(clientApi.createPedido).not.toHaveBeenCalled()
  })

  it("bloquea el pedido y muestra alerta visible de stock insuficiente si la cantidad solicitada supera el inventario", async () => {
    renderPedidos()

    const newBtn = await screen.findByRole("button", { name: /Nuevo Pedido/i })
    fireEvent.click(newBtn)

    // Seleccionar cliente
    const clientSelect = screen.getByLabelText(/Cliente/i)
    fireEvent.change(clientSelect, { target: { value: "1" } })

    // Seleccionar producto con stock 5
    const productSelects = screen.getAllByRole("combobox")
    // El select de producto en el primer item
    const prodSelect = productSelects.find((s) => s.innerHTML.includes("Caja Premium Especial"))
    expect(prodSelect).toBeTruthy()
    fireEvent.change(prodSelect, { target: { value: "10" } })

    // Ingresar cantidad 20 (supera stockActual = 5)
    const qtyInputs = screen.getAllByRole("spinbutton")
    const qtyInput = qtyInputs[0]
    fireEvent.change(qtyInput, { target: { value: "20" } })

    // Intentar crear pedido
    const submitBtn = screen.getByRole("button", { name: /Crear Pedido/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Stock insuficiente para Caja Premium Especial \(Disponible: 5, Solicitado: 20\)/i)
      ).toBeTruthy()
    })
    expect(clientApi.createPedido).not.toHaveBeenCalled()
  })
})
