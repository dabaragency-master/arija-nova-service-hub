import { describe, expect, it } from "vitest";
import { isServiceDue, nextServiceDate, normalizePhone, serviceDoneUpdate } from "@/lib/crm";

describe("crm rules", () => {
  it("yearly service is 12 months after the last service", () => {
    expect(nextServiceDate({ next_service_at: null, last_service_at: "2026-03-10", installed_at: "2024-01-01" })).toBe("2027-03-10");
  });
  it("falls back to installation date", () => {
    expect(nextServiceDate({ next_service_at: null, last_service_at: null, installed_at: "2025-11-01" })).toBe("2026-11-01");
  });
  it("due within 30 days, not at 31", () => {
    const today = new Date(2026, 9, 1);
    expect(isServiceDue("2026-10-31", today)).toBe(true);
    expect(isServiceDue("2026-11-01", today)).toBe(false);
  });
  it("marking service done schedules next in a year", () => {
    expect(serviceDoneUpdate("2026-10-25")).toEqual({ last_service_at: "2026-10-25", next_service_at: "2027-10-25" });
  });
  it("converts Croatian phone for WhatsApp", () => {
    expect(normalizePhone("091 123 4567")).toBe("385911234567");
  });
});
