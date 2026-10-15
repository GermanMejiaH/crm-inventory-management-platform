import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import Login from "../src/pages/Login"
import { ToastProvider } from "../src/components/ToastContext"
import * as clientApi from "../src/api/client"

vi.mock("../src/api/client")

describe("Pantalla de Login y Accesibilidad", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  function renderLogin(onLogin = vi.fn()) {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <Login onLogin={onLogin} />
        </ToastProvider>
      </MemoryRouter>
    )
  }

  it("renderiza el formulario con labels asociados, inputs accesibles y tarjeta de demo", () => {
    renderLogin()

    // Inputs vinculados a labels
    const emailInput = screen.getByLabelText(/Correo Electrónico/i)
    const passwordInput = screen.getByLabelText(/Contraseña/i)
    expect(emailInput).toBeTruthy()
    expect(passwordInput).toBeTruthy()

    // Botón de autocompletado demo
    expect(screen.getByRole("button", { name: /Autocompletar credenciales demo/i })).toBeTruthy()

    // Botón submit
    expect(screen.getByRole("button", { name: /Iniciar Sesión/i })).toBeTruthy()
  })

  it("autocompleta credenciales demostrativas al presionar el botón de ayuda", () => {
    renderLogin()

    const fillButton = screen.getByRole("button", { name: /Autocompletar credenciales demo/i })
    fireEvent.click(fillButton)

    const emailInput = screen.getByLabelText(/Correo Electrónico/i)
    const passwordInput = screen.getByLabelText(/Contraseña/i)

    expect(emailInput.value).toBe("demo.admin@portfolio.invalid")
    expect(passwordInput.value).toBe("local-demo-only-change-me")
  })

  it("muestra alerta accesible cuando falla la autenticación", async () => {
    clientApi.login.mockRejectedValue(new Error("Credenciales inválidas"))

    renderLogin()

    const fillButton = screen.getByRole("button", { name: /Autocompletar credenciales demo/i })
    fireEvent.click(fillButton)

    const submitButton = screen.getByRole("button", { name: /Iniciar Sesión/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      const alert = screen.getByRole("alert")
      expect(alert).toBeTruthy()
      expect(alert.textContent).toContain("Credenciales inválidas")
    })
  })

  it("invoca onLogin con el token al autenticar correctamente", async () => {
    clientApi.login.mockResolvedValue({ token: "test-valid-jwt" })
    const mockOnLogin = vi.fn()

    renderLogin(mockOnLogin)

    const fillButton = screen.getByRole("button", { name: /Autocompletar credenciales demo/i })
    fireEvent.click(fillButton)

    const submitButton = screen.getByRole("button", { name: /Iniciar Sesión/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith("test-valid-jwt")
    })
  })
})
