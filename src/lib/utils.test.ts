import { describe, it, expect } from "vitest"
import { formatMoney, formatMoneyCompact } from "./utils"

describe("formatMoney", () => {
  it("formats IDR amounts", () => {
    expect(formatMoney(1500000)).toContain("1.500.000")
    expect(formatMoney(1500000)).toContain("Rp")
  })

  it("formats USD amounts with its local symbol", () => {
    expect(formatMoney(1234.5, "USD")).toBe("$1,234.50")
  })

  it("handles null/undefined", () => {
    expect(formatMoney(null)).toBe("—")
    expect(formatMoney(undefined)).toBe("—")
    expect(formatMoney("")).toBe("—")
  })

  it("handles string amounts", () => {
    expect(formatMoney("50000")).toContain("50.000")
  })

  it("hides symbol when showSymbol=false", () => {
    const result = formatMoney(1000, "IDR", { showSymbol: false })
    expect(result).not.toContain("Rp")
    expect(result).toContain("1.000")
  })
})

describe("formatMoneyCompact", () => {
  it("formats millions", () => {
    expect(formatMoneyCompact(1500000)).toContain("1.5M")
  })

  it("formats thousands", () => {
    expect(formatMoneyCompact(50000)).toContain("50K")
  })

  it("formats billions", () => {
    expect(formatMoneyCompact(2000000000)).toContain("2B")
  })

  it("handles small amounts", () => {
    expect(formatMoneyCompact(500)).toBe("Rp 500")
  })

  it("handles null/undefined", () => {
    expect(formatMoneyCompact(null)).toBe("—")
    expect(formatMoneyCompact(undefined)).toBe("—")
  })
})
