/**
 * Requests the content of the summary span from the content script.
 * Returns the summary text, or 'Wrong direction' if not found.
 */
export async function checkForErrorsDuringMapGeneration(): Promise<string> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'GET_SUMMARY_SPAN' }, (response) => {
      if (response && typeof response.summary === 'string') {
        resolve(response.summary);
      } else {
        resolve('Wrong direction');
      }
    });
  });
}
