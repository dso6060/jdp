// get the currently active tab in the current window
// and then invoke the callback function gotTabs.
let query = { active: true, currentWindow: true };
chrome.tabs.query(query, gotTabs);

// function to check current url and eliminate offline urls.
function safeUrl(url) {
  return url.startsWith("https://") || url.startsWith("http://");
}

// callback function
function gotTabs(tabs) {
  // prevent offline urls to run the extension by throwing error.
  if (!safeUrl(tabs[0].url)) {
    document.getElementById("error").innerHTML = "Oh no!";
    document.getElementById("definition").innerHTML = "Unsupported Page.";
    return;
  }

  let msg = {
    txt: "hello from popup",
  };

  // send message to the content script
  chrome.tabs.sendMessage(tabs[0].id, msg, function (response) {
    if (!response) {
      document.getElementById("phonetic").innerHTML =
        "Refresh the page and try again.";
    } else if (response.swor === "_TextNotSelected_") {
      document.getElementById("phonetic").innerHTML = "Welcome!";
      document.getElementById("example").innerHTML =
        "Please select a word to find its definition.";
    } else {
      let swo = response.swor;
      swo = swo.replace(/[^a-zA-Z ]/g, "");
      dictionary(swo);
    }
  });
}

let APPS_SCRIPT_WEBHOOK = ""; // loaded from chrome.storage

chrome.storage && chrome.storage.sync.get(["APPS_SCRIPT_WEBHOOK"], (data) => {
  APPS_SCRIPT_WEBHOOK = data.APPS_SCRIPT_WEBHOOK || "";
});

let pageExtract,
  word,
  sourceurl;

// function to fetch and show definition on the popup from Justice Definitions Project
async function dictionary(query) {
  try {
    const api = "https://jdc-definitions.wikibase.wiki/w/api.php";
    // First: search for the page
    const searchParams =
      "action=query&list=search&srprop=snippet&format=json&origin=*" +
      `&srsearch=${encodeURIComponent(query)}`;
    const searchResp = await fetch(`${api}?${searchParams}`);
    const searchData = await searchResp.json();

    if (searchData && searchData.query && searchData.query.search && searchData.query.search.length > 0) {
      const first = searchData.query.search[0];
      const title = first.title;
      const pageid = first.pageid;

      // Second: fetch a plain-text intro extract for that page id
      const extractParams =
        `action=query&prop=extracts&explaintext=1&exintro=1&format=json&origin=*&pageids=${encodeURIComponent(pageid)}`;
      const extractResp = await fetch(`${api}?${extractParams}`);
      const extractData = await extractResp.json();

      let extractText = "";
      if (extractData && extractData.query && extractData.query.pages && extractData.query.pages[pageid]) {
        extractText = (extractData.query.pages[pageid].extract || "").trim();
      }

      // Fallback: clean up wiki markup from the search snippet if extract is empty
      if (!extractText) {
        const snippetHtml = first.snippet || "";
        const tmp = document.createElement("div");
        tmp.innerHTML = snippetHtml;
        const snippetText = (tmp.textContent || tmp.innerText || "");
        extractText = snippetText
          .replace(/\[\[[^\]]+\]\]/g, "")       // remove [[...]] wiki links/categories
          .replace(/\{\{[^}]+\}\}/g, "")          // remove {{...}} templates
          .replace(/==+[^=]*==+/g, "")               // remove == headings ==
          .replace(/\s+/g, " ")
          .trim();
      }

      word = title;
      sourceurl = `https://jdc-definitions.wikibase.wiki/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
      pageExtract = extractText;

      setValuesFromJDP();
    } else {
      showNoResultUI(query);
    }
  } catch (e) {
    document.getElementById("error").innerHTML = "⚠  Lookup failed";
    document.getElementById("definition").innerHTML = "";
    showNoResultUI(query);
  }
}

function setValuesFromJDP() {
  const truncated = pageExtract.length > 140 ? pageExtract.slice(0, 140) + "…" : pageExtract;
  document.getElementById(
    "word"
  ).innerHTML = `${word} <a href=${sourceurl} class="searchanchor" target="_blank"><img class="searchsvg" title="read more" src = "../assets/searchonweb.svg" alt="read more"/><a>`;
  document.getElementById("phonetic").innerHTML = "";
  document.getElementById("definition").innerHTML = truncated;
  document.getElementById("example").innerHTML = "";
  const nav = document.getElementById("navigatecontainer");
  if (nav && !nav.classList.contains("hidenavigator")) {
    nav.classList.add("hidenavigator");
  }
}

function showNoResultUI(query) {
  document.getElementById("error").innerHTML = "No result found";
  document.getElementById("definition").innerHTML = "";
  const btn = document.getElementById("requestBtn");
  if (btn && APPS_SCRIPT_WEBHOOK) {
    btn.classList.remove("hidenavigator");
    btn.onclick = async function () {
      const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const pageUrl = activeTabs && activeTabs[0] ? activeTabs[0].url : "";
      const nowIso = new Date().toISOString();
      try {
        const resp = await fetch(APPS_SCRIPT_WEBHOOK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term: query, page_url: pageUrl, timestamp: nowIso })
        });
        if (resp.ok) {
          document.getElementById("phonetic").innerHTML = "Request submitted.";
        } else {
          document.getElementById("phonetic").innerHTML = "Could not submit request.";
        }
      } catch (err) {
        document.getElementById("phonetic").innerHTML = "Network error submitting request.";
      }
    };
  }
}
