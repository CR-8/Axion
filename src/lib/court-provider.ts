// court-provider.ts
// Pluggable court data provider interface with a mock implementation.
// Swap MockCourtProvider with a real eCourts adapter when ready.

export interface CourtUpdateData {
  title: string;
  date: string; // ISO 8601
  content: string;
  source: string;
}

export interface CourtDataProvider {
  /**
   * Fetch court updates for a given case number.
   * @param externalCaseNumber - The official court case number
   * @param courtName - Court name for disambiguation
   * @param since - Only return updates after this date (ISO string or null for all)
   */
  fetchUpdates(
    externalCaseNumber: string,
    courtName: string | null,
    since: string | null,
  ): Promise<CourtUpdateData[]>;
}

// ── Mock Provider ────────────────────────────────────────────
// Returns realistic-looking court data for hackathon demos.

const MOCK_UPDATES: CourtUpdateData[] = [
  {
    title: "Hearing Adjourned",
    date: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    content:
      "The matter was called for hearing. Respondent's counsel sought adjournment on grounds of being engaged in another court. Adjournment granted. Next date of hearing fixed. Matter adjourned to next available date.",
    source: "mock_provider",
  },
  {
    title: "Order Copy Available",
    date: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    content:
      "Certified copy of the order dated previous hearing is now available for collection from the court registry. Parties to collect within 7 days. Application for condonation of delay stands disposed.",
    source: "mock_provider",
  },
  {
    title: "Next Hearing Date Fixed",
    date: new Date().toISOString(),
    content:
      "After hearing arguments from both sides, the Hon'ble Court has fixed the next date of hearing. Both parties are directed to file their written submissions before the next hearing date. Case posted for final arguments.",
    source: "mock_provider",
  },
];

export class MockCourtProvider implements CourtDataProvider {
  async fetchUpdates(
    _externalCaseNumber: string,
    _courtName: string | null,
    since: string | null,
  ): Promise<CourtUpdateData[]> {
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 800));

    if (!since) {
      return MOCK_UPDATES;
    }

    const sinceDate = new Date(since).getTime();
    return MOCK_UPDATES.filter((u) => new Date(u.date).getTime() > sinceDate);
  }
}

// Singleton — switch this to a real provider later
export function getCourtProvider(): CourtDataProvider {
  return new MockCourtProvider();
}
