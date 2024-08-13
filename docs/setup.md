## Setup

We need a content-script like this one:

https://github.com/evandor/tabsets/blob/chrome-extension/src-bex/tabsets-content-script.ts

This file has to be added to the src-bex directory and be loaded in the BrowserListeners file like that

```typescript
chrome.scripting.executeScript({
  target: {tabId: tab.id || 0, allFrames: false},
  files: ['tabsets-content-script']
}, (callback: any) => {
  if (chrome.runtime.lastError) {
    console.warn("could not execute script: " + chrome.runtime.lastError.message, info.url);
  }
});
```

