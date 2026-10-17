// Opens the iLLusive Theme Builder in the persistent Side Panel when clicking the toolbar icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));