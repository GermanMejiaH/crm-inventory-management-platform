import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import Configuracion from "../src/pages/Configuracion"
import { ToastProvider } from "../src/components/ToastContext"
import * as clientApi from "../src/api/client"

vi.mock("../src/api/client")

describe("Persistencia y Gestión de Configuración (Backend API sin LocalStorage)", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  const mockConfig = {
    costoManoObraUnitaria: 1500,
    companyInfo: {
      name: "Empresa de Prueba S.A.",
      tagline: "Eslogan Demostrativo",
      document: "NIT 800.111.222-3",
      address: "Calle 10 # 20-30",
      phone: "+57 300 000 0000",
      email: "info@empresa-prueba.invalid",
      website: "https://prueba.invalid"
    }
  }

  const mockOptions = {
    payments: ["Efectivo", "Transferencia"],
    orderStates: ["Pendiente", "Completado"]
  }

  function renderConfiguracion(token = "valid-token") {
    return render(
      <ToastProvider>
        <Configuracion token={token} />
      </ToastProvider>
    )
  }

  it("carga la configuración desde la API backend y la despliega en el formulario", async () => {
    clientApi.getOptions.mockResolvedValue(mockOptions)
    clientApi.getConfiguracion.mockResolvedValue(mockConfig)

    renderConfiguracion()

    await waitFor(() => {
      expect(clientApi.getConfiguracion).toHaveBeenCalledWith("valid-token")
    })

    const nameInput = await screen.findByLabelText(/Razón Social \/ Nombre Comercial/i)
    expect(nameInput.value).toBe("Empresa de Prueba S.A.")

    const costoInput = screen.getByLabelText(/Costo de Mano de Obra Unitaria/i)
    expect(Number(costoInput.value)).toBe(1500)

    // Verifica que se listen los métodos de pago
    expect(screen.getByText("Transferencia")).toBeTruthy()
  })

  it("persiste los cambios en la API backend sin tocar localStorage ni sessionStorage", async () => {
    clientApi.getOptions.mockResolvedValue(mockOptions)
    clientApi.getConfiguracion.mockResolvedValue(mockConfig)
    clientApi.updateConfiguracion.mockResolvedValue({
      costoManoObraUnitaria: 2200,
      companyInfo: {
        ...mockConfig.companyInfo,
        name: "Nueva Razón Social S.A.S."
      }
    })

    const localStorageSpy = vi.spyOn(Storage.prototype, "setItem")

    renderConfiguracion()

    const nameInput = await screen.findByLabelText(/Razón Social \/ Nombre Comercial/i)
    fireEvent.change(nameInput, { target: { value: "Nueva Razón Social S.A.S." } })

    const costoInput = screen.getByLabelText(/Costo de Mano de Obra Unitaria/i)
    fireEvent.change(costoInput, { target: { value: "2200" } })

    const submitBtn = screen.getByRole("button", { name: /Guardar Configuración/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(clientApi.updateConfiguracion).toHaveBeenCalledWith("valid-token", {
        costoManoObraUnitaria: 2200,
        companyInfo: expect.objectContaining({
          name: "Nueva Razón Social S.A.S."
        })
      })
    })

    // Asegura que no se haya invocado localStorage ni sessionStorage para persistir configuración
    expect(localStorageSpy).not.toHaveBeenCalledWith("companyInfo", expect.anything())
    expect(localStorageSpy).not.toHaveBeenCalledWith("configuracion", expect.anything())
    expect(localStorage.getItem("companyInfo")).toBeNull()
    expect(sessionStorage.getItem("companyInfo")).toBeNull()
  })

  it("notifica error cuando la API backend falla al persistir", async () => {
    clientApi.getOptions.mockResolvedValue(mockOptions)
    clientApi.getConfiguracion.mockResolvedValue(mockConfig)
    clientApi.updateConfiguracion.mockRejectedValue(new Error("Error de conexión"))

    renderConfiguracion()

    const submitBtn = await screen.findByRole("button", { name: /Guardar Configuración/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/Error al persistir la configuración en el servidor/i)).toBeTruthy()
    })
  })
})
