/**
 * DEV-ONLY instrumentation for the signing prototype. Everything here is gated on
 * `__DEV__` so NOTHING is logged or counted in a production build. It exists only
 * so first-open and render behaviour can be observed/verified during testing.
 */
export const docDebug = {
  firstPageDisplayed: 0, // times the FIRST document page reported a successful render
  firstPageError: 0,     // times the FIRST page failed to display
  firstOpenRecorded: 0,  // successful first-open records (server said recorded)
  firstOpenDuplicate: 0, // server reported this was a duplicate (already recorded)
  firstOpenFailed: 0,    // recordFirstOpen attempts that errored

  log(event: string, data?: unknown) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(`[doc-signing] ${event}`, data ?? "");
    }
  },

  reset() {
    this.firstPageDisplayed = 0;
    this.firstPageError = 0;
    this.firstOpenRecorded = 0;
    this.firstOpenDuplicate = 0;
    this.firstOpenFailed = 0;
  },
};
