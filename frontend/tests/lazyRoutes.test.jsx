import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import App, { PageLoadingFallback } from "../src/App"

vi.mock("../src/api/client", () => ({
  getOptions: vi.fn().mockResolvedValue({ payments: ["Efectivo"], orderStates: ["Pendiente"] }),
  getConfiguracion: vi.fn().mockResolvedValue({
    costoManoObraUnitaria: 1000,
    companyInfo: { name: "Aurora Demo S.A.S." }
  }),
  getClientes: vi.fn().mockResolvedValue([]),
  getProductos: vi.fn().mockResolvedValue([]),
  getDashboardStats: vi.fn().mockResolvedValue({ kpis: {}, stockCritico: [] })
}))

describe("Carga diferida (React.lazy + Suspense) y Accesibilidad de Estados de Carga", () => {
  it("renderiza el componente de fallback con atributos accesibles aria-live y role status", () => {
    render(<PageLoadingFallback />)

    const statusEl = screen.getByRole("status")
    expect(statusEl).toBeTruthy()
    expect(statusEl.getAttribute("aria-live")).toBe("polite")
    expect(statusEl.getAttribute("aria-label")).toBe("Cargando módulo")
    expect(screen.getByText(/Cargando módulo.../i)).toBeTruthy()
  })

  it("navega hacia una ruta cargada de forma diferida (/configuracion) y muestra el contenido tras resolución", async () => {
    render(
      <MemoryRouter initialEntries={["/configuracion"]}>
        <App initialToken="test-token" />
      </MemoryRouter>
    )

    // Al resolver la carga diferida, debe visualizarse el título de la página
    const heading = await screen.findByRole("heading", { name: /Configuración y Parámetros/i })
    expect(heading).toBeTruthy()
  })

  it("navega hacia la ruta diferida de clientes (/clientes) y resuelve de manera reactiva", async () => {
    render(
      <MemoryRouter initialEntries={["/clientes"]}>
        <App initialToken="test-token" />
      </MemoryRouter>
    )

    const heading = await screen.findByRole("heading", { name: /Gestión de Clientes/i })
    expect(heading).toBeTruthy()
  })
})
