const PRISTINE_STYLE = document.getElementById('mainStyle') ? document.getElementById('mainStyle').innerHTML : '';
const PRISTINE_BODY = document.getElementById('appShell') ? document.getElementById('appShell').outerHTML : '';
const STORAGE_KEY = 'illusive_theme_builder_state_v3';

let lastTestedUrl = null;
let localPreviewDataUrl = null;
let currentBgState = 'error';
let isRestoringState = false;
let currentOutputMode = 'json';
let paletteMode = 'mobile'; // 'mobile' | 'pc'
let latestJsonString = '';
let latestVencordCssString = '';

function hexToRgb(hex) {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  const num = parseInt(clean.substring(0, 6), 16) || 0;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbaStr(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function cleanHex(hex) {
  let h = String(hex || '').trim();
  if (!h.startsWith('#')) h = '#' + h;
  return h.substring(0, 7).toUpperCase();
}

function normalizeToSixHex(val, fallbackHex) {
  if (!val) return fallbackHex;
  const raw = Array.isArray(val) ? val[0] : val;
  if (typeof raw !== 'string') return fallbackHex;
  const s = raw.trim();

  if (s.startsWith('#')) {
    let hex = s.slice(1).trim();
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.slice(0, 3).split('').map(c => c + c).join('');
    } else if (hex.length >= 6) {
      hex = hex.slice(0, 6);
    }
    if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
      return '#' + hex.toUpperCase();
    }
  }

  const rgbMatch = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const r = Math.min(255, parseInt(rgbMatch[1], 10)).toString(16).padStart(2, '0');
    const g = Math.min(255, parseInt(rgbMatch[2], 10)).toString(16).padStart(2, '0');
    const b = Math.min(255, parseInt(rgbMatch[3], 10)).toString(16).padStart(2, '0');
    return ('#' + r + g + b).toUpperCase();
  }

  return fallbackHex;
}

function setColorInputPair(pickerId, textId, hexVal) {
  const clean = normalizeToSixHex(hexVal, '#000000');
  const picker = document.getElementById(pickerId);
  const text = document.getElementById(textId);
  if (picker) picker.value = clean;
  if (text) text.value = clean;
}

function saveStateToStorage() {
  if (isRestoringState) return;
  const state = {
    themeName: document.getElementById('themeName').value,
    authorName: document.getElementById('authorName').value,
    themeDesc: document.getElementById('themeDesc').value,
    authorId: document.getElementById('authorId').value,
    // Mobile palette
    cBgMain: document.getElementById('cBgMainText').value,
    cBgDark: document.getElementById('cBgDarkText').value,
    cAccent: document.getElementById('cAccentText').value,
    cTextMain: document.getElementById('cTextMainText').value,
    cTextMuted: document.getElementById('cTextMutedText').value,
    cLink: document.getElementById('cLinkText').value,
    // PC palette
    pcActiveText: document.getElementById('pcActiveText').value,
    pcPri1: document.getElementById('pcPri1').value,
    pcPri3: document.getElementById('pcPri3').value,
    pcSec1: document.getElementById('pcSec1').value,
    pcSec2: document.getElementById('pcSec2').value,
    pcSec3: document.getElementById('pcSec3').value,
    pcSec4: document.getElementById('pcSec4').value,
    pcTextMuted: document.getElementById('pcTextMuted').value,
    pcLink: document.getElementById('pcLink').value,

    bgUrl: document.getElementById('bgUrl').value,
    bgAlpha: document.getElementById('bgAlpha').value,
    bgBlur: document.getElementById('bgBlur').value,
    fallbackPreset: document.getElementById('fallbackPreset').value,
    outputMode: currentOutputMode,
    paletteMode: paletteMode
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ [STORAGE_KEY]: state });
  }
}

function applySavedStateObj(state) {
  if (!state || typeof state !== 'object') return;
  isRestoringState = true;
  if (state.themeName !== undefined) document.getElementById('themeName').value = state.themeName;
  if (state.authorName !== undefined) document.getElementById('authorName').value = state.authorName;
  if (state.themeDesc !== undefined) document.getElementById('themeDesc').value = state.themeDesc;
  if (state.authorId !== undefined) document.getElementById('authorId').value = state.authorId;

  // Mobile
  if (state.cBgMain) setColorInputPair('cBgMainPicker', 'cBgMainText', state.cBgMain);
  if (state.cBgDark) setColorInputPair('cBgDarkPicker', 'cBgDarkText', state.cBgDark);
  if (state.cAccent) setColorInputPair('cAccentPicker', 'cAccentText', state.cAccent);
  if (state.cTextMain) setColorInputPair('cTextMainPicker', 'cTextMainText', state.cTextMain);
  if (state.cTextMuted) setColorInputPair('cTextMutedPicker', 'cTextMutedText', state.cTextMuted);
  if (state.cLink) setColorInputPair('cLinkPicker', 'cLinkText', state.cLink);

  // PC
  if (state.pcActiveText) setColorInputPair('pcActiveTextPicker', 'pcActiveText', state.pcActiveText);
  if (state.pcPri1) setColorInputPair('pcPri1Picker', 'pcPri1', state.pcPri1);
  if (state.pcPri3) setColorInputPair('pcPri3Picker', 'pcPri3', state.pcPri3);
  if (state.pcSec1) setColorInputPair('pcSec1Picker', 'pcSec1', state.pcSec1);
  if (state.pcSec2) setColorInputPair('pcSec2Picker', 'pcSec2', state.pcSec2);
  if (state.pcSec3) setColorInputPair('pcSec3Picker', 'pcSec3', state.pcSec3);
  if (state.pcSec4) setColorInputPair('pcSec4Picker', 'pcSec4', state.pcSec4);
  if (state.pcTextMuted) setColorInputPair('pcTextMutedPicker', 'pcTextMuted', state.pcTextMuted);
  if (state.pcLink) setColorInputPair('pcLinkPicker', 'pcLink', state.pcLink);

  if (state.bgUrl !== undefined) document.getElementById('bgUrl').value = state.bgUrl;
  if (state.bgAlpha !== undefined) document.getElementById('bgAlpha').value = state.bgAlpha;
  if (state.bgBlur !== undefined) document.getElementById('bgBlur').value = state.bgBlur;
  if (state.fallbackPreset) document.getElementById('fallbackPreset').value = state.fallbackPreset;
  if (state.outputMode === 'css' || state.outputMode === 'json') {
    setOutputMode(state.outputMode, true);
  }
  if (state.paletteMode === 'pc' || state.paletteMode === 'mobile') {
    setPaletteMode(state.paletteMode, true);
  }

  isRestoringState = false;
  lastTestedUrl = null;
  updateTheme();
}

function restoreStateFromStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get([STORAGE_KEY], (res) => {
      if (res && res[STORAGE_KEY]) {
        applySavedStateObj(res[STORAGE_KEY]);
      } else {
        try {
          const local = JSON.parse(localStorage.getItem(STORAGE_KEY));
          if (local) applySavedStateObj(local);
        } catch (e) {}
      }
    });
  } else {
    try {
      const local = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (local) applySavedStateObj(local);
    } catch (e) {}
  }
}

function showFeedbackStatus(msg, isError) {
  const sub = document.getElementById('importFeedback');
  if (!sub) return;
  sub.textContent = msg;
  sub.style.color = isError ? '#fbbf24' : '#34d399';
  setTimeout(() => {
    sub.textContent = 'Mobile JSON + PC Vencord CSS';
    sub.style.color = '';
  }, 3500);
}

function setOutputMode(mode, skipUpdate) {
  currentOutputMode = mode === 'css' ? 'css' : 'json';
  const tabJson = document.getElementById('tabJsonBtn');
  const tabCss = document.getElementById('tabCssBtn');
  const outBox = document.getElementById('jsonOutput');

  if (currentOutputMode === 'css') {
    tabJson.classList.remove('active');
    tabCss.classList.add('active');
    outBox.classList.add('css-mode');
    outBox.value = latestVencordCssString;
  } else {
    tabCss.classList.remove('active');
    tabJson.classList.add('active');
    outBox.classList.remove('css-mode');
    outBox.value = latestJsonString;
  }

  if (!skipUpdate) saveStateToStorage();
}

function setPaletteMode(mode, skipUpdate) {
  paletteMode = mode === 'pc' ? 'pc' : 'mobile';
  const mobBtn = document.getElementById('paletteMobileBtn');
  const pcBtn = document.getElementById('palettePcBtn');
  const mobGrid = document.getElementById('mobilePaletteGrid');
  const pcGrid = document.getElementById('pcPaletteGrid');
  const cardTitle = document.getElementById('paletteCardTitle');

  if (paletteMode === 'pc') {
    mobBtn.classList.remove('active');
    pcBtn.classList.add('active');
    mobGrid.style.display = 'none';
    pcGrid.style.display = 'grid';
    cardTitle.textContent = 'Color Palette Engine (PC Vencord 9-Var)';
  } else {
    pcBtn.classList.remove('active');
    mobBtn.classList.add('active');
    pcGrid.style.display = 'none';
    mobGrid.style.display = 'grid';
    cardTitle.textContent = 'Color Palette Engine (Mobile Spec v2)';
  }

  if (!skipUpdate) saveStateToStorage();
}

// Build complete Vencord CSS using the dedicated PC Palette variables
function buildVencordCss(params) {
  const {
    themeName, themeDesc, authorName, authorId,
    pcActiveText, pcPri1, pcPri3, pcSec1, pcSec2, pcSec3, pcSec4, pcTextMuted, pcLink,
    bgUrl, bgAlpha, bgBlur
  } = params;

  const safeTitle = (themeName || 'iLLusive Theme').replace(/"/g, '\\"');
  const safeAuthor = (authorName || 'iLLusive Studio').replace(/"/g, '\\"');
  const safeBgUrl = bgUrl ? `url('${bgUrl.replace(/'/g, "\\'")}')` : 'none';

  const primary1 = pcPri1;
  const primary2 = rgbaStr(pcPri1, 0.5);
  const primary3 = pcPri3;
  const primary4 = rgbaStr(pcPri3, 0.65);

  const secondary1 = pcSec1;
  const secondary2 = pcSec2;
  const secondary3 = pcSec3;
  const secondary4 = pcSec4;

  const blurRule = (bgBlur > 0 || bgAlpha < 1) ? `
/* Optional Wallpaper Blur & Opacity Layer */
    #app-mount::before {
        content: "";
        position: fixed;
        inset: 0;
        background: var(--background);
        background-position: center;
        background-size: cover;
        opacity: ${bgAlpha};
        filter: blur(${bgBlur}px);
        transform: scale(1.05);
        pointer-events: none;
        z-index: -1;
    }` : '';

  return `/**
 * @name ${themeName || 'Will of Fire'}
 * @author ${authorName || 'iLLusive Studio'}
 * @version 2.0.0
 * @description ${themeDesc || 'Generated by iLLusive Theme Builder'}
 * @authorId ${authorId || '879393496627306587'}
 */

:root{
    --background: ${safeBgUrl};
    --activetext-colour: ${pcActiveText};

    --primary1-colour: ${primary1};
    --primary2-colour: ${primary2};
    --primary3-colour: ${primary3};
    --primary4-colour: ${primary4};

    --secondary1-colour: ${secondary1};
    --secondary2-colour: ${secondary2};
    --secondary3-colour: ${secondary3};
    --secondary4-colour: ${secondary4};

    /* Additional Text & Link Palette Bindings */
    --text-normal: ${pcActiveText};
    --text-muted: ${pcTextMuted};
    --text-link: ${pcLink};
    --header-primary: ${pcActiveText};
    --header-secondary: ${pcTextMuted};
    --channels-default: ${pcTextMuted};
}
  
/*
Theme Generated by ${authorName || 'iLLusive Studio'}
Adapted from VaporousCreeper#9514 & Transparency2 Module by Ruben7173#5048
*/

/*Background image*/
    #app-mount {
        background: ${(bgBlur > 0 || bgAlpha < 1) ? 'transparent' : 'var(--background)'};
        background-position: center; 
        background-size: cover; 
    }${blurRule}

    #app-mount .bg__960e4,
    #app-mount .app__160d8 { 
        background-color: var(--secondary4-colour); 
    }

/*Home and Discover*/
    /*Nitro*/
        #app-mount .applicationStore_f07d62 .card_b5493b { background-color: var(--secondary1-colour); }
        #app-mount .applicationStore_f07d62 .card_b5493b:hover { background-color: var(--secondary2-colour)!important; }
        #app-mount .applicationStore_f07d62 .cardDescription_b5493b { background-image: linear-gradient(to bottom,var(--secondary2-colour) 50%,hsl(var(--primary-660-hsl)/.75) 80%); }

        #app-mount .applicationStore_f07d62,
        #app-mount .homeWrapperNormal__0920e,
        #app-mount .homeWrapperNormal__0920e .mainPageScroller__80907{ 
            background-color: transparent; 
        }

        #app-mount .giftNitro__80907 .textContainer__0f226 { background: none; }

        #app-mount .applicationStore_f07d62 .trialOfferWrapper-2Y24ok .button__201d5,
        #app-mount .activitiesBannerContainer-aAnWk6 .button__201d5 {
            background-color: var(--activetext-colour);
        } 

        #app-mount .applicationStore_f07d62 .giftNitro__80907 { background-color: var(--secondary3-colour); }
    
    /*Shop*/
        #app-mount .shop__6db1d,
        #app-mount .shop__6db1d .page__1feb0,
        #app-mount .shop__6db1d .shopScroll__1feb0,
        #app-mount .shop__6db1d .filterBar__11877,
        #app-mount .shopScroll__08415,
        #app-mount .shop__08415 { 
            background-color: transparent; 
        }
        
        #app-mount .shop__6db1d .shopCard_c3d04b { background-color: var(--secondary1-colour); }
        #app-mount .shop__6db1d .shopCard_c3d04b .cardText_c3d04b { background-color: var(--secondary1-colour); }

        #app-mount .shop__6db1d .shopViewWrapper__6db1d { background-color: var(--secondary4-colour); }
        #app-mount .shop__6db1d .headerBar__80679 {background-color: var(--secondary3-colour)!important;}
    
    /*Sidebar: Direct Messages*/
        #app-mount .channel__972a0,
        #app-mount .sidebar__5e434 .categoryItem_c72b37 { 
            margin-bottom: 2px; 
            transition: background-color 0.2s; 
            transition-timing-function: ease-in-out
        }
        #app-mount .channel__972a0:hover, 
        #app-mount .interactive-1vLZ_I.interactiveSelected__972a0,
        #app-mount .sidebar__5e434 .categoryItem_c72b37:hover,
        #app-mount .sidebar__5e434 .categoryItem_c72b37.selected__91a9d {
            background-color: var(--secondary2-colour);
        }

        #app-mount .privateChannelsHeaderContainer__99e7c {
            background-color: var(--primary3-colour);
            padding: 12px;
            border-radius: 10px;
        }

        #app-mount .containerDefault_c69b6d .wrapper__2ea32:hover,
        #app-mount .containerDefault_c69b6d.selected_c69b6d .wrapper__2ea32 { 
            background-color: var(--secondary2-colour)
        }

        #app-mount .container__133bf,
        #app-mount .container__133bf .container__9293f,
        #app-mount .container__133bf .tabBody__133bf,
        #app-mount .container__133bf .container__7d20c,
        #app-mount .container__133bf .nowPlayingColumn__133bf {
            background-color: transparent;
        }

        #app-mount .tabBody__133bf .searchBar__5ec2f { background-color: var(--secondary3-colour); }
        #app-mount .tabBody__133bf .searchBar__5ec2f:focus-within { border-color: var(--primary1-colour); }

        #app-mount .item__133bf.addFriend__133bf { background-color: var(--primary1-colour); }
        #app-mount .item__133bf.addFriend__133bf span { color: var(--activetext-colour); }

    /*Discover Servers*/
        #app-mount .sidebar__5e434 .container__551b0 {background-color: var(--secondary4-colour);}

        #app-mount .scroller__23746 {
            background-color: transparent; 
            background-color: var(--secondary4-colour);
        }

        #app-mount .content_f0d60d .card__84e3e  {
            background-color: var(--secondary3-colour);
        }
        #app-mount .contentSection_b6bcee .card__84e3e:hover {background-color: var(--secondary2-colour);}

        #app-mount .contentSection_b6bcee .searchBoxInput-3h4etz {background-color: transparent;}

    /*Now Active*/
        #app-mount .nowPlayingColumn__133bf .itemCard__7e549 {background-color: var(--secondary3-colour);}
        #app-mount .nowPlayingColumn__133bf .itemCard__7e549:hover {background-color: var(--secondary1-colour);}
        #app-mount .nowPlayingColumn__133bf .itemCard__7e549 .body__00943 {background-color: var(--secondary2-colour);}

    /*App Directory*/
        #app-mount .directoryContainer_da3f59 {
            background-color: var(--secondary4-colour)
        }

        #app-mount .directoryContainer_da3f59 .container_d9c848,
        #app-mount .container_d7acc7 .category_d7acc7 {
            transition: background-color 0.2s; 
            transition-timing-function: ease-in-out;
        }

        #app-mount .directoryContainer_da3f59 .container_d9c848:hover,
        #app-mount .container_d7acc7 .category_d7acc7:hover {
            background-color: var(--secondary2-colour);
        }

        #app-mount .directoryContainer_da3f59 .inputDefault__0f084 {border-color: transparent!important;}
        #app-mount .directoryContainer_da3f59 .searchBox_d727b3:focus-within {
            border-color: var(--primary1-colour);
        }

/*In Servers*/
    #app-mount .wrapper_ef3116.guilds__5e434 { background-color: transparent; }
    
    #app-mount .numberBadge__2b1f5 {
        background-color: var(--primary1-colour)!important;
        color: var(--activetext-colour);
    }

    /*Icon Servers*/
        #app-mount .blobContainer_e5445c .wrapper__6e9f8 {background-color: var(--secondary1-colour);}
        #app-mount .blobContainer_e5445c .wrapper__6e9f8:hover {background-color: var(--primary3-colour);}
    /*Letter Servers*/
        #app-mount .childWrapper__6e9f8 ,#app-mount .circleIconButton__5bc7e {background-color: var(--secondary1-colour);}
        #app-mount .childWrapper__6e9f8:hover ,#app-mount .circleIconButton__5bc7e:hover {background-color: var(--primary3-colour);}

    /*Server Folders*/
        #app-mount .folderGroup__48112 .folderGroupBackground__48112 { 
            background-color: var(--secondary3-colour); 
        }
        
    /*Server Boosting*/
        #app-mount .root__5c9fc .scroller__6fd0e { background-color: var(--secondary3-colour); }

        #app-mount .root__5c9fc .topPerksCard__3add8,
        #app-mount .root__5c9fc .wrapper__5b98e {
            background-color: var(--secondary1-colour);
        }

        #app-mount .root__5c9fc .headerWave__1dfae path { fill: var(--secondary3-colour)!important; }

        #app-mount .page__5e434 .container__89463,
        #app-mount .page__5e434 .container__89463 .contentContainer__89463 { 
            background-color: transparent; 
        }

        #app-mount .page__5e434 .toolbar__89463,
        #app-mount .page__5e434 .container__89463 .sidebarContainer__89463 { 
            background-color: var(--secondary3-colour); 
        }

        #app-mount .page__5e434 .container__89463 .container__5573a { background-color: var(--secondary3-colour); }
        #app-mount .page__5e434 .container__89463 .container__5573a.active__5573a { background-color: var(--secondary1-colour); }

    /*Channels*/
        #app-mount .sidebarList__5e434.sidebarListRounded__5e434 .container__2637a { background-color: transparent; }
        #app-mount .sidebarList__5e434.sidebarListRounded__5e434 .container_f37cb1[data-has-banner="false"] .header_f37cb1 { background-color: var(--secondary3-colour); }  
        
        #app-mount .sidebarList__5e434.sidebarListRounded__5e434 .privateChannels_e6b769,
        #app-mount .sidebarList__5e434.sidebarListRounded__5e434 .privateChannels_e6b769 .scroller__99e7c {
            background-color: transparent;
        }

        #app-mount .containerDefault__29444 {
            background-color: var(--primary3-colour); 
            height: 30px; text-align: center; 
            border-radius: 10px; 
            padding: 5px 5px 0 5px;
        }

        #app-mount .containerDefault__29444 .iconVisibility__29444:not(.collapsed__29444) .overflow_b0dfc2 { color: var(--activetext-colour); }

        #app-mount .activityPanel__5e434 {
            background-color: var(--secondary4-colour); 
            background-color: rgba(0,0,0,0); 
            margin-bottom: 0;
        }

        #app-mount .containerDefault__29444 { margin-top: 15px; }
        #app-mount .containerDefault_c69b6d { margin-right: 10px; }

        #app-mount .mention__3b95d,
        #app-mount .mentionsBadge__933a1 .numberBadge__2b1f5 {
            background-color: var(--primary1-colour)!important;
        }

        #app-mount .unreadBar__629e4 {background-color: var(--secondary2-colour);}

        #app-mount .autocomplete__13533 {background-color: var(--secondary3-colour);}

        #app-mount .containerDefault_c69b6d .wrapper__2ea32 .link__2ea32 { background-color: transparent; }

        #app-mount .sidebarListRounded__5e434 { border-radius: 0; }
        #app-mount .sidebarListRounded__5e434 .container_f37cb1 { border-right: 1px solid; }
        #app-mount .sidebarListRounded__5e434 .header_f37cb1 { border-radius: 0; }

        #app-mount .sidebarListRounded__5e434 .container_f37cb1[data-had-banner="true"] .header_f37cb1 { background-color: transparent; }

        #app-mount .channelChatWrapper_cb9592 {background: transparent!important;}

        /*Text Channels*/
            #app-mount .containerDefault_c69b6d .wrapper__2ea32:hover { width: 100%; }
            #app-mount .containerDefault_c69b6d.selected_c69b6d .wrapper__2ea32 { width: 100%; }
            #app-mount .containerDefault_c69b6d .wrapper__2ea32 { background-color: var(--secondary1-colour) }

            #app-mount .containerDefault_c69b6d .wrapper__2ea32 {
                border-radius: 10px 0 0 10px;
                width: 230px; 
                transition: width 0.2s; 
                transition-timing-function: ease-in-out; 
            }

            #app-mount .containerDefault_c69b6d .modeMuted__2ea32,
            #app-mount .containerDefault_c69b6d .modeLocked__2ea32 { 
                background-color: var(--secondary3-colour); 
            }
            
            #app-mount .actionBar_aa605f {
                background-color: var(--secondary3-colour); 
                border-radius: 5px;
            }

        /*Voice Channels*/
            #app-mount .containerDefault_c69b6d .modeConnected__2ea32 { width: 100%; 
                background-color: var(--secondary2-colour); 
            }

            /*VC Info*/
                #app-mount .panels__5e434 {
                    background-color: var(--secondary3-colour);
                }

                #app-mount .sidebar__5e434::after { background-color: transparent; }

                #app-mount .panels__5e434 .flex__7c0ba .button__67645,
                #app-mount .panels__5e434 .actionButtons_e131a9 {
                    background-color: var(--secondary3-colour);
                    border-radius: 3px;
                }

                #app-mount .panels__5e434 .button__201d5:hover, 
                #app-mount .panels__5e434 .avatarWrapper__37e49:hover {
                    background-color: var(--secondary2-colour);
                }
            
                #app-mount .button__67645[aria-label="Disconnect"] {background-color: var(--primary3-colour)!important;}
                #app-mount .button__67645[aria-label="Disconnect"]:hover {background-color: var(--primary2-colour)!important;}

            /*VC User*/
                #app-mount .list_c3cd7d { padding-left: 10px; }
                #app-mount .userAvatar__55bab { margin-left: 15px; }


                #app-mount .voiceUser__07f91[data-speaking="true"] .userAvatar__55bab {box-shadow: 0 0 0 2px var(--primary1-colour)!important;}
                #app-mount .voiceUser__07f91[data-speaking="true"]::after {
                    content: ":";
                    color: transparent; 

                    background-image: linear-gradient(to right, var(--primary2-colour), rgba(0,0,0,0));
                    padding: 0 120px 11px 0;
                    border-left: 5px solid var(--primary1-colour);

                    position: relative;
                    top: -29px;

                    z-index: -1;
                }

                #app-mount .voiceUser__07f91 .content__07f91:hover {background-color: transparent;}
                #app-mount .voiceUser__07f91 {
                    transition: margin 0.2s; 
                    transition-timing-function: ease-in-out; 
                    margin-left: 0; 
                    padding-right: 5px
                }
                #app-mount .voiceUser__07f91:hover {
                    background-color: var(--secondary1-colour); 
                    border-radius: 2px; margin-left: 20px;
                }

            /*Live Feed*/
                #app-mount .wrapper__1405b .controlButton__1405b[aria-label="Share Your Screen"],
                #app-mount .wrapper__1405b .controlButton__1405b[aria-label="Disconnect"] {
                    background-color: var(--primary2-colour);
                }
                #app-mount .wrapper__1405b .controlButton__1405b .staticButton_f1ceac,
                #app-mount .buttonContainer__1405b .controlButton__1405b {
                    background-color: var(--secondary2-colour);
                }

                #app-mount .streamPreview__6da2d,
                #app-mount .streamPreview__6da2d .body__6da2d {
                    background-color: var(--secondary3-colour);
                }

                #app-mount .callContainer_cb9592,
                #app-mount .callContainer_cb9592 .root_bfe55a,
                #app-mount .wrapper_cb9592.video_cb9592 {
                    background: transparent;
                }

                #app-mount .pulseGradient__11664 {opacity: 0%; }

            /*Noise Suppression*/
                #app-mount .noiseCancellationPopout_e131a9 { background-color: var(--secondary3-colour); }

    /*Messages*/
        #app-mount .chatContent_f75fb0,
        #app-mount .chat_f75fb0,
        #app-mount .chatContent_f75fb0 .wrapper_d852db,
        #app-mount .chatContent_f75fb0 .wrapper_d852db .wrapper_fc8177  {
            background-color: transparent;
        }

        #app-mount .subtitleContainer_f75fb0 { background-color: var(--secondary3-colour); }

        #app-mount code { background-color: var(--secondary1-colour) }

        #app-mount .mention,
        #app-mount .channelMention .name_b52c3f {
            background-color: var(--primary3-colour); 
            color: var(--primary1-colour);
        }

        #app-mount .mentioned__5126c {
            background-color: var(--primary3-colour);
        }
        #app-mount .mentioned__5126c .contents-2mQqc9, 
        #app-mount .mentioned__5126c .container-1ov-mD,
        #app-mount .channelMention {
            background-color: var(--primary3-colour);
        }
        #app-mount .mentioned__5126c:before {
            background: var(--primary1-colour); 
            width: 3px;
        }

        #app-mount .channelMention .channelWithIcon path {fill: var(--primary1-colour)}

        #app-mount a[target="_blank"] {color: var(--text-link, var(--primary1-colour));}

        #app-mount .newMessagesBar__0f481 { background-color: var(--primary1-colour) } 
        #app-mount .newMessagesBar__0f481:hover {background-color: var(--primary2-colour);}

        #app-mount .newMessagesBar__0f481 .span__0f481, 
        #app-mount .newMessagesBar__0f481 .barButtonAlt__0f481 { 
            color: var(--activetext-colour);
        }

        #app-mount .jumpToPresentBar__0f481 {background-color: var(--secondary3-colour);}
        #app-mount .jumpToPresentBar__0f481:hover {background-color: var(--secondary2-colour);}

        #app-mount .message__5126c {padding: 0px 48px 0px 72px;}
        #app-mount .message__5126c.cozyMessage__5126c .container_b7e1cb,
        #app-mount .message__5126c.cozyMessage__5126c .contents_c19a55 {
            background-color: var(--secondary1-colour);
            padding: 5px 0px 5px 20px;
        }

        #app-mount .message__5126c.compact_c19a55 {padding-left: 0;}
        #app-mount .message__5126c.compact_c19a55 .contents_c19a55 {
            background-color: var(--secondary1-colour);
            padding: 5px 0px 5px 80px;
            text-indent: 0;
        }
        #app-mount .message__5126c.compact_c19a55 .container_b7e1cb {
            background-color: var(--secondary1-colour);
            padding: 5px 0px 5px 52px;
        }

        #app-mount .buttonContainer_c19a55 .wrapper_f7ecac {
            background-color: var(--secondary1-colour);
            margin: 2px 20px 0px 0px;
        }
        #app-mount .hasReply_c19a55 .buttonContainer_c19a55 .wrapper_f7ecac { margin-top: 24px; }

        #app-mount .form_f75fb0 .wrapper__44df5,
        #app-mount .form_f75fb0 .scrollableContainer__74017 {
            background-color: var(--secondary3-colour);
        }

        #app-mount .form_f75fb0 .channelTextArea_f75fb0 { background-color: transparent; }
        #app-mount .form_f75fb0 .channelTextArea_f75fb0 .stackedBars__74017 { background-color: var(--secondary2-colour); }

        /*Embeds*/
            #app-mount .embedFull__623de {
                background-color: var(--secondary1-colour); 
                border-left: 4px solid;
                border-radius: 10px!important;
            }

        /*Media Player*/
            #app-mount .unreadBar-3YD_k9 {background-color: var(--primary1-colour);}

            #app-mount .messageAttachment__5dae1 a[target="_blank"] {color: var(--primary2-colour);}
            #app-mount .mediaBarProgress_f7877e,
            #app-mount .mediaBarProgress_f7877e::before, 
            #app-mount .mediaBarProgress_f7877e::after, 
            #app-mount .mediaBarProgress_f7877e .mediaBarGrabber_f7877e{
                background-color: var(--primary1-colour);
            }

        /*Discussions*/
            #app-mount .chat_f75fb0 .mainCard_f369db {
                background-color: var(--secondary3-colour);
                border-radius: 10px
            }
            #app-mount .chat_f75fb0 .headerRow-1MKoR- div[style*="max-height: 500px;"] {background-color: var(--secondary3-colour);}
            #app-mount .chat_f75fb0 .tagsContainer-2bBw1x {
                background-color: var(--secondary3-colour);
                border-radius: 0 0 10px 10px;
                padding: 24px 0 15px 20px;
            }
            #app-mount .chat_f75fb0 .matchingPostsRow_f369db {
                background-color: var(--secondary2-colour);
                border-radius: 0;
            }

            #app-mount .title_f75fb0,
            #app-mount .chat_f75fb0 .container_f369db {
                background-color: transparent;
            }

            #app-mount .container__01ae2 { background-color: var(--secondary4-colour) }
            #app-mount .container__01ae2 .container__9293f,
            #app-mount .resizeHandle__01ae2 { 
                background-color: var(--secondary3-colour); 
            }

            #app-mount .chat_f75fb0 .mainCard_f369db:hover,
            #app-mount .chat_f75fb0 .mainCard_f369db.isOpen_faa96b,
            #app-mount .chat_f75fb0 .mainCard_f369db.headerWithMatchingPosts_f369db {
                background-color: var(--secondary2-colour);
            }

            #app-mount .chat_f75fb0 .mainCard_f369db.headerWithMatchingPosts_f369db { border-radius: 10px 10px 0 0; }

            #app-mount .chat_f75fb0 .mainCard_f369db .icon_a22cb0 path { fill: var(--activetext-colour); }
            #app-mount .chat_f75fb0 .sortDropdownTextHighContrastForcedColor_f369db { color: var(--activetext-colour); }

            #app-mount .chat_f75fb0 .container_ca49a1 { background-color: var(--secondary1-colour); }

            #app-mount .chat_f75fb0 .pill_a2c9e8.selected_a2c9e8 { 
                border-color: var(--primary1-colour); 
                background-color: var(--primary4-colour);
            }

            #app-mount .chat_f75fb0 .pill_a2c9e8.selected_a2c9e8 div { color: var(--activetext-colour)!important; }

            #app-mount .chat_f75fb0 .tagsContainer_f369db .countContainer_f369db { background-color: var(--secondary3-colour); }

        /*Reactions*/
            #app-mount .reaction__23977.reactionMe__23977 {
                background-color: var(--primary3-colour);
                border-color: var(--primary1-colour);
            }

        /*Server tabs - IE Browse channels and Members*/
            #app-mount .chat_f75fb0 .header__0b563,
            #app-mount .chat_f75fb0 .content_f75fb0,
            #app-mount .chat_f75fb0 .pageBody__41ed7 {
                background: transparent!important;
            }

            #app-mount .chat_f75fb0 .roundButton_c15210.activeButton_c15210 { 
                background-color: var(--primary1-colour); 
                color: var(--activetext-colour);
            }

            #app-mount .chat_f75fb0 .pageButton_c15210:not(.activeButton_c15210):hover,
            #app-mount .chat_f75fb0 .channelRow_e4503a:hover { 
                background-color: var(--secondary2-colour); 
            }

/*Server Members*/
    #app-mount .container_c8ffbb,
    #app-mount .members_c8ffbb { 
        background-color: transparent; 
    }

    #app-mount .member__5d473 {
        margin-left: 30px;
        transition: margin-left 0.2s;
        transition-timing-function: ease-in-out;
        border-radius: 10px;
        background-color: var(--secondary1-colour);
    }
    #app-mount .member__5d473:hover { margin-left: 8px; background-color: var(--secondary2-colour);}
    #app-mount .selected__91a9d { margin-left: 8px; background-color: var(--secondary2-colour);}

    #app-mount .members_c8ffbb .container__0f2e8 { background-color: var(--secondary1-colour); }
    #app-mount .members_c8ffbb .container__0f2e8:hover { background-color: var(--secondary2-colour); }

    #app-mount .membersGroup_c8ffbb span {color: var(--activetext-colour);}
    #app-mount .membersGroup_c8ffbb {
        background-color: var(--primary3-colour);

        border: 2px solid var(--primary3-colour);
        border-radius: 8px;

        height: 20px;
        padding: 0 0 0 10px;
        margin: 15px 8px 0 16px;
    }

/*ScrollBars*/
    #app-mount ::-webkit-scrollbar-thumb {background-color: var(--primary2-colour); border-color: transparent;}

    #app-mount .messagesWrapper__36d07 ::-webkit-scrollbar-track-piece, 
    #app-mount .peopleColumn__133bf ::-webkit-scrollbar-track-piece, 
    #app-mount .homeWrapperNormal__0920e ::-webkit-scrollbar-track-piece,
    #app-mount .container-3wLKDe ::-webkit-scrollbar-track-piece,
    #app-mount .enterDone__5c9fc ::-webkit-scrollbar-track-piece {
        background-color: transparent; 
        border-color: transparent;
    }
    #app-mount .messagesWrapper__36d07 ::-webkit-scrollbar-track, 
    #app-mount .peopleColumn__133bf ::-webkit-scrollbar-track, 
    #app-mount .homeWrapperNormal__0920e ::-webkit-scrollbar-track,
    #app-mount .container-3wLKDe ::-webkit-scrollbar-track,
    #app-mount .enterDone__5c9fc ::-webkit-scrollbar-track,
    #app-mount .chat_f75fb0 .container_f369db ::-webkit-scrollbar-track {
        background-color: var(--primary3-colour); 
        border-radius: 10px; 
        border-color: var(--primary3-colour)
    }

/*Settings*/
    #app-mount .standardSidebarView__23e6b,
    #app-mount .sidebarRegion__23e6b,
    #app-mount .contentRegion__23e6b,
    #app-mount .layer__960e4,
    #app-mount .contentRegionScroller__23e6b,
    #app-mount .sidebarRegionScroller__23e6b {
        background-color: transparent;
    }

    #app-mount .sidebarRegion__23e6b .side_aa8da2 .item_aa8da2 {
        line-height:15px; 
        background-color: var(--secondary1-colour); 
        width: 100%; 
        transition: width 0.2s; 
        transition-timing-function: ease-in-out;
    }
    #app-mount .sidebarRegion__23e6b .side_aa8da2 .item_aa8da2:hover {
        background-color: var(--secondary2-colour); 
        width:187px;
    }
    #app-mount .sidebarRegion__23e6b .side_aa8da2 .selected_aa8da2 {
        line-height:15px; 
        background-color: var(--secondary2-colour)!important; 
        width:187px;
    }

    #app-mount .sidebar__23e6b .side_aa8da2 .header_aa8da2 {
        background-color: var(--primary3-colour); 
        border-radius: 3px; 
        line-height:28px; 
        padding:5px 0 5px 10px
    }

    #app-mount .sidebar__23e6b {
        padding: 20px 18px 20px 23px;
        width: 210px;
        margin-right: 20px;
    }

    #app-mount .noticeRegion__23e6b .container__9a9f9 { background-color: var(--secondary3-colour); }

    #app-mount .contentRegion__23e6b .item_aa8da2:not(.tab_f8303a, .settingsTabBarItem_dc2e0e, .tabBarItem__81b3e) {
        transition: background-color 0.2s; 
        transition-timing-function: ease-in-out; 
    }
    #app-mount .contentRegion__23e6b .item_aa8da2:hover:not(.tab_f8303a, .settingsTabBarItem_dc2e0e, .tabBarItem__81b3e)  {
        background-color: var(--secondary2-colour);
    }
    #app-mount .contentRegion__23e6b .item_aa8da2.selected_aa8da2:not(.tab_f8303a, .settingsTabBarItem_dc2e0e, .tabBarItem__81b3e) {
        background-color: var(--primary3-colour);
    }

    #app-mount .button_a22cb0.primary_a22cb0:not(.shinyButton__6a443, .collapseBtn_a4a127, .buttonColor_e131a9, .colorWhite__201d5, .colorBrandInverted__201d5, .root__5c9fc .button_a22cb0),
    #app-mount .lookFilled__201d5:not(.shinyButton__6a443, .collapseBtn_a4a127, .buttonColor_e131a9, .colorWhite__201d5, .colorBrandInverted__201d5), 
    #app-mount .barFill_a562c8,
    #app-mount .container__3f21e.checked__3f21e {
        background-color: var(--primary1-colour)!important;
    }

    #app-mount .button_a22cb0.primary_a22cb0:not(.shinyButton__6a443, .collapseBtn_a4a127, .buttonColor_e131a9, .colorWhite__201d5, .colorBrandInverted__201d5) span,
    #app-mount .lookFilled__201d5:not(.shinyButton__6a443, .collapseBtn_a4a127, .buttonColor_e131a9, .colorWhite__201d5, .colorBrandInverted__201d5) .contents__201d5 {
        color: var(--activetext-colour);
    }

    #app-mount .container__3f21e.checked__3f21e svg path {fill: var(--primary1-colour)}

    #app-mount .lookOutlined__201d5.colorRed__201d5 { background-color: var(--primary4-colour); }

    #app-mount .select_a16aea {
        background-color: var(--secondary3-colour);
        border-color: var(--secondary3-colour);
    }
    #app-mount .option_a16aea {background-color: var(--secondary3-colour)}
    #app-mount .option_a16aea .selectedIcon_a16aea path {fill: var(--primary1-colour);}
    #app-mount .option_a16aea:hover,
    #app-mount .option_a16aea[aria-selected="true"] {
        background-color: var(--primary3-colour);
    }

    #app-mount .inputDefault__0f084 {background-color: var(--secondary3-colour); border: 1px solid transparent;}
    #app-mount .inputDefault__0f084:focus {border-color: var(--primary1-colour);}
    
    #app-mount .card__73069 {
        border-color: var(--secondary3-colour);
        background-color: var(--secondary1-colour);
    }

    #app-mount .anchor_edefb8 {color: var(--text-link, var(--primary1-colour));}
    
    #app-mount .card_b846e5,
    #app-mount .emojiTable_e7d73e {
        padding-left: 15px;
        padding-right: 15px;
    }
    #app-mount .card_b846e5{ border-radius: 3px; }
    #app-mount .card_b846e5 .removeGame_cc46f0 { background-color: var(--secondary3-colour); }

    #app-mount .popout_a16aea {
        background-color: var(--secondary3-colour);
    }

    #app-mount .switchIndicator_a28278[style*="background-color: rgb(88, 101, 242)"] { background-color: var(--primary1-colour)!important; }
    #app-mount .switchIndicator_a28278[style*="background-color: rgb(68, 82, 187)"] { background-color: var(--primary2-colour)!important; }

    #app-mount .radioGroupOption__64e61[data-selected="true"] .outerRadioFill__64e61 { fill: var(--primary1-colour); }

    /*User Settings*/
        #app-mount .content_e9e3ed { background-color: transparent; }

        #app-mount .content_e9e3ed .contentHeader_e9e3ed,
        #app-mount .sidebar__409aa { 
            background-color: var(--secondary1-colour); 
        }

        #app-mount .sidebar__409aa .item_caf372.active_caf372 { background-color: var(--primary4-colour); }

        #app-mount .accountProfileCard__1fed1 {background-color: var(--secondary1-colour);}   
        
        #app-mount .accountProfileCard__1fed1 .background__1fed1 { background-color: var(--secondary3-colour); }
        #app-mount .accountProfileCard__1fed1 .background__1fed1 .fieldList__1fed1 { background-color: transparent; }

        #app-mount .channelTextArea__74017:focus-within { border-color: var(--primary1-colour) ; }

        #app-mount .button__201d5.lookLink__201d5 { color: var(--text-link, var(--primary1-colour)); }
        
        #app-mount .radioIndicator__88a69.radioIndicatorChecked__88a69 .refreshIconFill__88a69 { fill: var(--primary1-colour); }
        #app-mount .radioIndicator__88a69.radioIndicatorChecked__88a69 .refreshIconStroke__88a69 { stroke: var(--primary1-colour); }

        #app-mount .expandedProgressBarContainerSettingsPage_a61c56,
        #app-mount .giftCard_a45ed3 { 
            background-color: var(--secondary3-colour); 
        }

        #app-mount .detailsBlock_e335a7,
        #app-mount .paymentPane__01014 { 
            background-color: var(--secondary3-colour); 
        }

        #app-mount .verticalFit__01014.paginator__01014 { background-color: transparent; }
        #app-mount .paymentRow__01014 { background-color: transparent; }

        #app-mount .paymentPane__01014 .expandedInfo_e9cb00 { background-color: var(--secondary2-colour); }
        
        #app-mount .switchContainer_eda416 { background-color: var(--secondary3-colour); }
        #app-mount .myServersContainer__6de8b .headerContainer__7db08 { background-color: transparent; }
        #app-mount .myServersContainer__6de8b .headerContainer__7db08 .container_a45028:focus-within { border-color: var(--primary1-colour); }

        #app-mount .tabBar_d6f9e9 .tabBarItem_d6f9e9.selected_aa8da2,
        #app-mount .tabBar_d6f9e9 .tabBarItem_d6f9e9:hover {
            border-color: var(--primary1-colour)
        }
        
        #app-mount .connectContainer_c7f964,
        #app-mount .connection_c7f964 {
            border-color: var(--secondary3-colour);
            background-color: var(--secondary1-colour);
        }
        #app-mount .connection_c7f964 .connectionHeader_c7f964 {background-color:var(--secondary3-colour) ;}

        #app-mount .perksContainer-1hGJpM .bigPerkCard-1uwmWV,
        #app-mount .perksContainer-1hGJpM .smallPerkCard-2sX_-- {
            background-color: var(--secondary1-colour);
        }

        #app-mount .checkbox_f525d3.checked_f525d3 {
            background-color: var(--primary1-colour)!important; 
            border-color: var(--primary1-colour)!important
        }

        #app-mount .notificationSettings__4d38b .wrapper_e03935 {border-color: var(--primary1-colour);}
        #app-mount .notificationSettings__4d38b .selected_e03935.option_e03935 {background-color: var(--primary1-colour);}
        #app-mount .notificationSettings__4d38b .option_e03935:hover {background-color: var(--primary2-colour)!important;}
        
        #app-mount .contentRegion__23e6b .guildContainer__5dba5,
        #app-mount .contentRegion__23e6b .wrapper__37ae5,
        #app-mount .contentRegion__23e6b .wrapper__5b98e  { 
            background-color: var(--secondary1-colour); 
        }
        #app-mount .contentRegion__23e6b .appliedBoostContainer_ceb06a { background-color: transparent; }
        #app-mount .contentRegion__23e6b .appliedBoostContainer_ceb06a .boostContainer_ceb06a {background-color: var(--secondary3-colour);}

        #app-mount .contentRegion__23e6b .content__99f8c {justify-content: center;}

        #app-mount .contentRegion__23e6b .customContainer__23e6b { justify-content: center; }
        #app-mount .contentRegion__23e6b ::-webkit-scrollbar-track { background-color: transparent; }

        #app-mount .bd-switch-checked .bd-switch-body {background-color: var(--primary1-colour)}
        #app-mount .bd-switch-checked .bd-switch-body svg path {fill: var(--primary1-colour)}

        #app-mount .bd-select {
            background-color: var(--secondary3-colour);
            border-color: var(--secondary3-colour);
        }
        #app-mount .bd-select .bd-select-options {background-color: var(--secondary3-colour)}
        #app-mount .bd-select .bd-select-option:hover {background-color: var(--secondary3-colour);}
        #app-mount .bd-select .bd-select-option.selected {background-color: var(--primary3-colour);}

        #app-mount .bd-addon-list .bd-addon-header {
            background-color: var(--secondary3-colour);
        }
        #app-mount .bd-addon-list .bd-addon-card {
            border-color: var(--secondary3-colour);
            background-color: var(--secondary1-colour);
        }

        #app-mount .contentRegion__23e6b .card__5cea9 { background-color: var(--secondary3-colour); }
        #app-mount .contentRegion__23e6b .header__5cea9 { background-color: var(--secondary2-colour); }

        #app-mount .tab_f8303a.selected_aa8da2,
        #app-mount .settingsTabBarItem_dc2e0e.selected_aa8da2,
        #app-mount .tabBarItem__81b3e.selected_aa8da2 { 
            color: var(--primary1-colour); 
        }
        #app-mount .tab_f8303a::after,
        #app-mount .settingsTabBarItem_dc2e0e::after,
        #app-mount .tabBarItem__81b3e::after { 
            background-color: var(--primary1-colour); 
        }

        #app-mount .contentRegion__23e6b .emptyContainer_de8069 { background-color: var(--secondary3-colour); }

        #app-mount .contentRegion__23e6b .box_f8c98c { background-color: var(--secondary3-colour); }

        #app-mount .contentRegion__23e6b .authedAppV2__50a54 { background-color: var(--secondary3-colour); }
        #app-mount .contentRegion__23e6b .authedAppV2__50a54 .headerV2__50a54 { background-color: var(--secondary2-colour); }

        #app-mount .header__217b7 .groupContent__9d98d { background-color: var(--secondary2-colour); }
        #app-mount .overlayEnabledSettingsContainer__9d98d .collapseable__217b7 { background-color: var(--secondary3-colour); }
        #app-mount .overlayEnabledSettingsContainer__9d98d .groupCollapsedContainer__9d98d,
        #app-mount .overlayEnabledSettingsContainer__9d98d .groupCollapsedContainer__9d98d .groupContainer__9d98d { 
            background-color: transparent; 
        }

        #app-mount .content_e9e3ed .bd-setting-item .bd-box.selected { background-color: var(--primary1-colour); } 
        #app-mount .content_e9e3ed .bd-container { 
            background-color: transparent; 
            border-color: var(--primary1-colour);
        }

        #app-mount .content_e9e3ed .bd-slider-track { background-image: linear-gradient( var(--primary1-colour), var(--primary1-colour) ); }

    /*Server Settings*/
        #app-mount .header_c6bf1b {background-color: var(--secondary3-colour);}

        #app-mount .tabBar__81b3e .tab_f8303a.selected_aa8da2,
        #app-mount .tabBar__81b3e .tab_f8303a:hover {
            border-color: var(--primary1-colour)
        }

        #app-mount .row__93d4a:hover {
            background-color: var(--secondary1-colour);
            border-radius: 3px;
        }

        #app-mount .copyInputDefault_e19ebf {background-color: var(--secondary3-colour);}
        #app-mount .contentExpandContainer__217b7 .container_e5c5d5,
        #app-mount .contentExpandContainer__217b7 .groupCollapsedContainer__6f5a6 {
            background-color: transparent;
        }
        #app-mount .contentExpandContainer__217b7 {
            border: 1px solid var(--secondary3-colour);
            background-color: var(--secondary1-colour);
            border-radius: 3px;
        }

        #app-mount .setupContainer_f11d9e .container_e5c5d5 {background-color: var(--secondary1-colour);}

        #app-mount .editCard_a25a68 .triggerMainContainer_b6c6eb {
            border-color: var(--secondary3-colour);
            background-color: var(--secondary1-colour);
        }

        #app-mount .editCard_a25a68 .iconWrapper__0d13e {background-color: var(--secondary2-colour);}

        #app-mount .editCard_a25a68 .mentionLimitContainer_ed9c90,
        #app-mount .editCard_a25a68 .keywordListContainer__09e76,
        #app-mount .editCard_a25a68 .keywordsContainer__6a631 .keywordsTextArea__6a631,
        #app-mount .editCard_a25a68 .collapseable__217b7,
        #app-mount .editCard_a25a68 .actionContainer__6446f {
            background-color: var(--secondary3-colour);
        }
        
        #app-mount .editCard_a25a68 .input_fea832,
        #app-mount .editCard_a25a68 .resultsListParent-39cvai {
            background-color: var(--secondary3-colour);
            border-radius: 8px;
        }
        #app-mount .editCard_a25a68 .resultsList-2Bp-2_::-webkit-scrollbar-track {background-color: transparent;}

        #app-mount .container_ea91d1 .creatorBenefitCard__1f0b1,
        #app-mount .container_ea91d1 .howItWorksContainer_aa72d6,
        #app-mount .root__759ac .card_ea91d1 {
            background-color: var(--secondary3-colour);
        }

        #app-mount .tier_a36dee .tierHeader_a36dee {background-color: var(--secondary3-colour);}
        #app-mount .tier_a36dee .tierBody_a36dee {background-color: var(--secondary1-colour);}
        
        #app-mount .directoryModal-YJsOMv .content_da3f59 {
            max-width: 76%;
            margin: 0;
            padding: 32px 15% 64px 15%;
            background-color: var(--secondary4-colour);
        }
        #app-mount .directoryModal-YJsOMv {
            background-image: var(--background); 
            background-position: center; 
            background-size: cover; 
            padding: 0 0 0 0!important;
            width: 100%;
        }
        #app-mount .directoryModal-YJsOMv div[aria-hidden="true"] {height: 0px!important;}

        #app-mount .group__344e6 {background-color: var(--secondary1-colour);}
        #app-mount .group__344e6 .item__344e6:hover {background-color: var(--secondary2-colour);}

        #app-mount .settingCard-xZSDjS {background-color: var(--secondary1-colour);}

        #app-mount .mainTableContainer_fa2640,
        #app-mount .scrollerContainer__4b8d8,
        #app-mount .editCard_a25a68 { 
            background-color: var(--secondary3-colour); 
        }

        #app-mount .setupContainer_f11d9e .contentExpandContainer__217b7,
        #app-mount .setupContainer_f11d9e .backgroundModifierContainer_d96a9c,
        #app-mount .setupContainer_f11d9e .clickableContainer_d96a9c,
        #app-mount .setupContainer_f11d9e .container_d96a9c,
        #app-mount .setupContainer_f11d9e .collapseable__217b7 { 
            background-color: transparent; 
        }

        #app-mount .setupContainer_f11d9e .header__217b7 { background-color: var(--secondary3-colour); }

        #app-mount .setupContainer_f11d9e .groupCollapsedRow__5d030 { background-color: var(--secondary1-colour); }

        #app-mount .saveNoticeContainer__51673 .container__9a9f9 { background-color: var(--secondary3-colour); }

        #app-mount .contentRegion__23e6b .container_d8f25b {background-color: var(--secondary3-colour);}
        #app-mount .contentRegion__23e6b .container_d8f25b:hover {background-color: var(--secondary2-colour);}

        #app-mount .titleContainer_e29cd7,
        #app-mount .contentRegion__23e6b .scroller__53543 {
            background-color: transparent;
        }

        #app-mount .settingCard__1a4ef:not(.active__1a4ef ) { background-color: var(--secondary3-colour); }
        #app-mount .settingCard__1a4ef.active__1a4ef { background-color: transparent; }
        #app-mount .settingCard__1a4ef.active__1a4ef .cardContent_f62fce { 
            background-color: var(--secondary2-colour); 
            border-radius: 8px 8px 0 0 ;
        }
        #app-mount .settingCard__1a4ef.active__1a4ef .cardFolder__1a4ef { background-color: var(--secondary3-colour); }

/*ChangeLog And Other Popups*/
    #app-mount .modal__4f3da,
    #app-mount .browser_d98031,
    #app-mount .menu_c1e9c4,
    #app-mount .messagesPopoutWrap_e8b59c {
        background-color: var(--secondary3-colour); 
        border-radius: 10px;
    }

    #app-mount .tooltipPointer_c36707 {border-top-color: var(--secondary3-colour);}

    #app-mount .root__49fc1,
    #app-mount .tooltipContent_c36707,
    #app-mount .tooltip_c36707,
    #app-mount .container__3dde2,
    #app-mount .sectionTag-euh3ZW {
        background-color: var(--secondary3-colour);
        border-radius: 10px;
        border-color: transparent;
    }

    #app-mount .root__49fc1 {
        box-shadow: none;
    }

    #app-mount .root__49fc1 .container__0f084:focus-within { border-color: var(--primary1-colour); }

    #app-mount .header__49fc1 {
        background-color: var(--primary3-colour);
        border-radius: 10px 10px 0 0;
    }

    #app-mount .content__49fc1 {padding-top: 20px;}

    #app-mount .footer__49fc1 {
        background-color: var(--secondary2-colour);
        border-radius: 0 0 10px 10px;
    }

    #app-mount .input_ac6cb0,
    #app-mount .bgScale_b78547,
    #app-mount .item_c1e9c4.focused_c1e9c4:not(.colorDanger_c1e9c4),
    #app-mount .messageGroupWrapper_e8b59c:hover {
        background-color: var(--secondary2-colour);
    }

    #app-mount .focusLock__49fc1 ::-webkit-scrollbar {
        display: none;
    }

    #app-mount .messageGroupWrapper_e8b59c:hover .jumpButton_e8b59c {
        background-color: var(--secondary3-colour);
    }

    #app-mount .container__4e30a,
    #app-mount .container_d5ae15 { 
        background-color: var(--secondary3-colour); 
    }

    #app-mount .root_a55fdc .footer_a55fdc,
    #app-mount .content_a8c622 { 
        background-color: transparent; 
    }

    #app-mount .checkboxOption__714a9[data-selected="true"] .checkboxIndicator__714a9 { background-color: var(--primary1-colour); }

    /* Discussion Tag popup */
        #app-mount .container__5808f { background-color: var(--secondary3-colour); }

        #app-mount .countContainer__5808f { background-color: var(--primary1-colour); }
        #app-mount .countContainer__5808f .countText__5808f { color: var(--activetext-colour); }

        #app-mount .container__5808f .pill_a2c9e8.selected_a2c9e8 { 
            border-color: var(--primary1-colour); 
            background-color: var(--primary4-colour);
        }

        #app-mount .container__5808f .pill_a2c9e8.selected_a2c9e8 div { color: var(--activetext-colour)!important; }

    /* Permission Popup */
        #app-mount .container__8a031 { background-color: var(--secondary3-colour); }
        
        #app-mount .checkbox__09aca.checked__09aca { 
            background-color: var(--primary1-colour); 
            border-color: var(--primary1-colour);
        }

        #app-mount .container__8a031 .container__0e476 .anchor_edefb8 { background-color: var(--secondary2-colour); }

    /*BetterDiscord Popups and other bits*/
        #app-mount .bd-modal-header { background-color: var(--primary3-colour); }
        #app-mount .bd-modal-root { background-color: var(--secondary3-colour); }
        #app-mount .bd-modal-footer { background-color: var(--secondary2-colour); }

        #app-mount .bd-button.selected,
        #app-mount .bd-button-filled.bd-button-color-red,
        #app-mount .bd-button:active { 
            background-color: var(--primary1-colour); 
        }

        #app-mount .bd-addon-store-card { background-color: var(--secondary3-colour); }
        #app-mount .bd-addon-store-card:hover { background-color: var(--secondary2-colour); }
        #app-mount .bd-addon-store-card .bd-button-filled,
        #app-mount .bd-empty-image-container .bd-button-filled { 
            background-color: var(--primary1-colour); 
        }

    /*Inbox popup*/
        #app-mount .header-PfVfAO,
        #app-mount .channelHeader__35a7e {
            background-color: var(--secondary2-colour);
        }

        #app-mount .container__95796:hover,
        #app-mount .messages__1ccd1:hover {
            background-color: var(--secondary1-colour);
        }

        #app-mount .recentMentionsPopout__95796,
        #app-mount .recentMentionsPopout__95796 .container__95796:hover .jumpButton_ed0c8c,
        #app-mount .recentMentionsPopout__95796 .messages__1ccd1 .jumpButton_ed0c8c {
            background-color: var(--secondary3-colour);
        }

        #app-mount .container__95796,
        #app-mount .messages__1ccd1 {
            border-radius: 10px;
            padding-right: 0;
        }

        #app-mount .channelHeader__35a7e {border-radius: 10px 10px 0 0;}
        #app-mount .channelHeader__35a7e .badge__35a7e {background-color: var(--primary1-colour);}
        #app-mount .recentMentionsPopout__95796 .scroller__2692d {
            padding: 0!important;
        }

/*User Popup*/
    #app-mount .outer_c0bea0:not(.custom-theme-background) .inner_c0bea0 ,
    #app-mount .outer_c0bea0:not(.custom-theme-background) {
        background: transparent;
    }
    
    #app-mount .outer_c0bea0:not(.custom-theme-background) { background-color: var(--secondary3-colour)!important; }

    #app-mount .outer_c0bea0:not(.custom-theme-background) .role_dfa8b6,
    #app-mount .outer_c0bea0:not(.custom-theme-background) .channelTextArea__74017 .inner_a99829 {
        background-color: var(--secondary1-colour);
    }

/*Search Popup*/
    #app-mount .container__55c99,
    #app-mount .container__55c99 ul {
        background-color: var(--secondary3-colour);
    }

    #app-mount .searchFilter_bd8186,
    #app-mount .searchAnswer_bd8186 {
        background-color: var(--secondary2-colour);
    }

    #app-mount .queryContainer__55c99 {
        background-color: var(--secondary2-colour);
    }

    #app-mount .react-datepicker__day {background-color: var(--secondary1-colour);}
    #app-mount .react-datepicker__day:hover {background-color: var(--secondary2-colour);}

    #app-mount .react-datepicker__day--today::after {background-color: var(--primary1-colour);}

    #app-mount .react-datepicker__day--disabled,
    #app-mount .react-datepicker__day--outside-month {
        background-color: var(--secondary3-colour);
    }

    #app-mount .react-datepicker,
    #app-mount .react-datepicker__header {
        background-color: transparent;
    }

    #app-mount .container__55c99 .hintValue__16eb0 {background-color: var(--primary1-colour);}

/*Join & Create Server Popup*/
    #app-mount .container-1Lk8p7 .header__49fc1 {padding-bottom: 24px;}
    #app-mount .container-1Lk8p7 .header__49fc1 .heading-xl-semibold__5e2e4,
    #app-mount .container-1Lk8p7 .header__49fc1 .text-md-normal__6a4eb,
    #app-mount .container-1Lk8p7 .footer__49fc1 .footerTitle-3Bslxi,
    #app-mount .container-1Lk8p7 .footer__49fc1 .contents__201d5,
    #app-mount .container-1Lk8p7 .container-x8Y1ix .text-md-bold_c22b0c,
    #app-mount .container-1Lk8p7 .rowContainer-3t7486 .rowText-3MQqQi {
        color: var(--activetext-colour)!important;
    }

    #app-mount .container-1Lk8p7 .footer__49fc1 {
        background-color: var(--secondary2-colour); 
        box-shadow: none;
    }

    #app-mount .container-1Lk8p7 .container-x8Y1ix,
    #app-mount .container-1Lk8p7 .rowContainer-3t7486 {
        background-color: var(--secondary1-colour);
    }
    #app-mount .container-1Lk8p7 .container-x8Y1ix:hover,
    #app-mount .container-1Lk8p7 .rowContainer-3t7486:hover {
        background-color: var(--secondary2-colour);
    }

    #app-mount .container-1Lk8p7 .input__0ed4f,
    #app-mount .container-1Lk8p7 .input-m1-Y7Q {
        background-color: var(--secondary1-colour);
    }

    #app-mount .container-1Lk8p7 .iconContainer-GFfNaA circle {fill: var(--primary1-colour)}

    #app-mount .container-1Lk8p7 .content__49fc1 {margin-top: 24px;}

/*Emoji, Gif and SoundBoard Picker Popup*/
    #app-mount .contentWrapper__08434 { background-color: var(--secondary3-colour); }
    #app-mount .contentWrapper__08434 .wrapper__4e6ce,
    #app-mount .contentWrapper__08434 .header__8ef02,
    #app-mount .contentWrapper__08434 .container_fed6d3,
    #app-mount .contentWrapper__08434 .header_fed6d3 { 
        background-color: transparent; 
    }

    #app-mount .contentWrapper__08434 .unicodeShortcut_b9ee0c,
    #app-mount .contentWrapper__08434 .inspector_aeaaeb { 
        background-color: var(--secondary3-colour); 
    }

    #app-mount .contentWrapper__08434 .wrapper__14245 { background-color: var(--secondary1-colour); }

    #app-mount .contentWrapper__08434 .wrapper__14245 .header__14245 { 
        background-color: var(--primary3-colour); 
        padding: 4px;
        border-radius: 5px;
    }

    #app-mount .contentWrapper__08434 .wrapper__72c38:focus-within { 
        border-color: var(--primary1-colour); 
        outline: none; 
    }

    #app-mount .contentWrapper__08434 .categoryFadeBlurple_d02962,
    #app-mount .contentWrapper__08434 .result__2dc39 { 
        background-color: var(--primary3-colour)!important; 
    }

/*TopBar*/ 
    #app-mount .title_c38106::before {
        content: "${safeTitle} By ${safeAuthor}";
        color: var(--text-muted);
        font-weight: 500;

        position: left;
        margin-right: 10px;
    }
    #app-mount .title_c38106 {
        background-color: var(--secondary3-colour);
        border-bottom: 3px solid var(--primary3-colour)
    }`;
}

function loadThemeFromString(rawStr) {
  const trimmed = rawStr.trim();

  if (!trimmed.startsWith('{') && (trimmed.includes(':root') || trimmed.includes('--primary1-colour'))) {
    const nameMatch = trimmed.match(/@name\s+([^\r\n*]+)/);
    const authorMatch = trimmed.match(/@author\s+([^\r\n*]+)/);
    const descMatch = trimmed.match(/@description\s+([^\r\n*]+)/);
    const idMatch = trimmed.match(/@authorId\s+([^\r\n*]+)/);

    if (nameMatch) document.getElementById('themeName').value = nameMatch[1].trim();
    if (authorMatch) document.getElementById('authorName').value = authorMatch[1].trim();
    if (descMatch) document.getElementById('themeDesc').value = descMatch[1].trim();
    if (idMatch) document.getElementById('authorId').value = idMatch[1].trim();

    const bgMatch = trimmed.match(/--background:\s*url\(['"]?([^'")]+)['"]?\)/i);
    if (bgMatch && bgMatch[1]) {
      document.getElementById('bgUrl').value = bgMatch[1].trim();
      localPreviewDataUrl = null;
      lastTestedUrl = null;
    }

    const extractCssVar = (varName, fallback) => {
      const m = trimmed.match(new RegExp(varName + ':\\s*([^;\\r\\n}]+)', 'i'));
      return m ? normalizeToSixHex(m[1].trim(), fallback) : fallback;
    };

    // Populate PC palette variables
    setColorInputPair('pcActiveTextPicker', 'pcActiveText', extractCssVar('--activetext-colour', document.getElementById('pcActiveText').value));
    setColorInputPair('pcPri1Picker', 'pcPri1', extractCssVar('--primary1-colour', document.getElementById('pcPri1').value));
    setColorInputPair('pcPri3Picker', 'pcPri3', extractCssVar('--primary3-colour', document.getElementById('pcPri3').value));
    setColorInputPair('pcSec1Picker', 'pcSec1', extractCssVar('--secondary1-colour', document.getElementById('pcSec1').value));
    setColorInputPair('pcSec2Picker', 'pcSec2', extractCssVar('--secondary2-colour', document.getElementById('pcSec2').value));
    setColorInputPair('pcSec3Picker', 'pcSec3', extractCssVar('--secondary3-colour', document.getElementById('pcSec3').value));
    setColorInputPair('pcSec4Picker', 'pcSec4', extractCssVar('--secondary4-colour', document.getElementById('pcSec4').value));
    setColorInputPair('pcTextMutedPicker', 'pcTextMuted', extractCssVar('--text-muted', document.getElementById('pcTextMuted').value));
    setColorInputPair('pcLinkPicker', 'pcLink', extractCssVar('--text-link', document.getElementById('pcLink').value));

    setPaletteMode('pc');
    updateTheme();
    showFeedbackStatus('Extracted Vencord CSS Theme Variables!', false);
    return;
  }

  try {
    const data = JSON.parse(trimmed);
    const sem = data.semanticColors || {};
    const raw = data.rawColors || {};
    const plus = data.plus || {};
    const bg = data.background || {};

    if (typeof data.name === 'string') document.getElementById('themeName').value = data.name;
    if (typeof data.description === 'string') document.getElementById('themeDesc').value = data.description;
    if (Array.isArray(data.authors) && data.authors.length > 0) {
      if (data.authors[0].name) document.getElementById('authorName').value = data.authors[0].name;
      if (data.authors[0].id) document.getElementById('authorId').value = data.authors[0].id;
    }

    const mainBg = normalizeToSixHex(
      sem.BACKGROUND_PRIMARY || sem.PANEL_BG || sem.CHAT_BACKGROUND || sem.HOME_BACKGROUND || raw.PRIMARY_600 || raw.BRAND_600,
      document.getElementById('cBgMainText').value
    );
    const darkBg = normalizeToSixHex(
      sem.SCROLLBAR_THIN_THUMB || sem.SCROLLBAR_AUTO_THUMB || sem.REDESIGN_ACTIVITY_CARD_BACKGROUND_PRESSED || raw.BRAND_530 || raw.BLACK_500 || sem.BG_BACKDROP || sem.BACKGROUND_SECONDARY,
      document.getElementById('cBgDarkText').value
    );
    const accentColor = normalizeToSixHex(
      sem.BACKGROUND_ACCENT || raw.BRAND_500 || plus.mentionLineColor || sem.STATUS_DANGER || raw.RED_500 || sem.MENTION_BACKGROUND,
      document.getElementById('cAccentText').value
    );
    const textMain = normalizeToSixHex(
      sem.TEXT_NORMAL || sem.HEADER_PRIMARY || sem.TEXT_PRIMARY || raw.WHITE_500 || raw.PRIMARY_100,
      document.getElementById('cTextMainText').value
    );
    const textMuted = normalizeToSixHex(
      sem.TEXT_MUTED || sem.HEADER_SECONDARY || sem.CHANNELS_DEFAULT || raw.WHITE_630 || raw.PLUM_6,
      document.getElementById('cTextMutedText').value
    );
    const linkColor = normalizeToSixHex(
      sem.TEXT_LINK || raw.BLUE_345 || accentColor,
      document.getElementById('cLinkText').value
    );

    setColorInputPair('cBgMainPicker', 'cBgMainText', mainBg);
    setColorInputPair('cBgDarkPicker', 'cBgDarkText', darkBg);
    setColorInputPair('cAccentPicker', 'cAccentText', accentColor);
    setColorInputPair('cTextMainPicker', 'cTextMainText', textMain);
    setColorInputPair('cTextMutedPicker', 'cTextMutedText', textMuted);
    setColorInputPair('cLinkPicker', 'cLinkText', linkColor);

    if (typeof bg.url === 'string') {
      document.getElementById('bgUrl').value = bg.url;
      localPreviewDataUrl = null;
      lastTestedUrl = null;
    }
    if (bg.alpha !== undefined && bg.alpha !== null) {
      const parsedAlpha = parseFloat(bg.alpha);
      if (!Number.isNaN(parsedAlpha)) {
        document.getElementById('bgAlpha').value = String(Math.max(0, Math.min(1, parsedAlpha)));
      }
    }
    if (bg.blur !== undefined && bg.blur !== null) {
      const parsedBlur = parseInt(bg.blur, 10);
      if (!Number.isNaN(parsedBlur)) {
        document.getElementById('bgBlur').value = String(Math.max(0, Math.min(25, parsedBlur)));
      }
    }

    setPaletteMode('mobile');
    updateTheme();
    showFeedbackStatus('Extracted "' + (data.name || 'Theme') + '" JSON!', false);
  } catch (err) {
    showFeedbackStatus('Invalid JSON/CSS Format!', true);
  }
}

function setStatusBadge(text, type) {
  const badge = document.getElementById('bgStatusBadge');
  badge.textContent = text;
  badge.className = `bg-status status-${type}`;
}

function showAnimeFallback(show) {
  const fallbackLayer = document.getElementById('animeFallbackLayer');
  const preset = document.getElementById('fallbackPreset').value || 'scene-sunset';
  fallbackLayer.className = `anime-scene ${preset}`;
  fallbackLayer.style.display = show ? 'block' : 'none';
}

function applyVisualSliders(bgAlpha, bgBlur) {
  const mockBg = document.getElementById('mockBg');
  const fallbackLayer = document.getElementById('animeFallbackLayer');
  const filterVal = bgBlur > 0 ? `blur(${bgBlur}px)` : 'none';
  const scaleVal = bgBlur > 0 ? 'scale(1.08) translateZ(0)' : 'scale(1) translateZ(0)';

  mockBg.style.opacity = String(bgAlpha);
  mockBg.style.filter = filterVal;
  mockBg.style.webkitFilter = filterVal;
  mockBg.style.transform = scaleVal;

  if (fallbackLayer) {
    fallbackLayer.style.filter = filterVal;
    fallbackLayer.style.webkitFilter = filterVal;
  }
}

function validateAndApplyBg(url) {
  const mockBg = document.getElementById('mockBg');

  if (localPreviewDataUrl) {
    showAnimeFallback(false);
    mockBg.style.backgroundImage = `url("${localPreviewDataUrl}")`;
    setStatusBadge('Local File Active', 'ok');
    return;
  }

  if (!url) {
    currentBgState = 'error';
    mockBg.style.backgroundImage = 'none';
    showAnimeFallback(true);
    setStatusBadge('Fallback Anime BG', 'warn');
    return;
  }

  if (url === lastTestedUrl) {
    if (currentBgState === 'error') {
      mockBg.style.backgroundImage = 'none';
      showAnimeFallback(true);
    }
    return;
  }

  lastTestedUrl = url;
  setStatusBadge('Checking URL...', 'warn');

  const probe = new Image();
  probe.referrerPolicy = 'no-referrer';

  probe.onload = () => {
    if (lastTestedUrl !== url) return;
    currentBgState = 'loaded';
    showAnimeFallback(false);
    mockBg.style.backgroundImage = `url("${url.replace(/"/g, '\\"')}")`;
    setStatusBadge('Custom URL Loaded', 'ok');
  };

  probe.onerror = () => {
    if (lastTestedUrl !== url) return;
    currentBgState = 'error';
    mockBg.style.backgroundImage = 'none';
    showAnimeFallback(true);
    setStatusBadge('URL Expired — Fallback Active', 'warn');
  };

  probe.src = url;
}

function updateTheme() {
  const bgUrl = document.getElementById('bgUrl').value.trim();
  const alphaSlider = document.getElementById('bgAlpha');
  const blurSlider = document.getElementById('bgBlur');

  const rawAlpha = parseFloat(alphaSlider.value);
  const bgAlpha = Number.isNaN(rawAlpha) ? 1 : rawAlpha;
  const rawBlur = parseInt(blurSlider.value, 10);
  const bgBlur = Number.isNaN(rawBlur) ? 0 : rawBlur;

  document.getElementById('alphaVal').textContent = bgAlpha.toFixed(2);
  document.getElementById('blurVal').textContent = String(bgBlur);

  // Read colors based on active palette mode
  let activeBgMain, activeDark, activeAccent, activeTextMain, activeTextMuted, activeLink;

  if (paletteMode === 'pc') {
    activeTextMain = cleanHex(document.getElementById('pcActiveText').value);
    activeAccent = cleanHex(document.getElementById('pcPri1').value);
    activeDark = cleanHex(document.getElementById('pcPri3').value);
    activeBgMain = cleanHex(document.getElementById('pcSec1').value);
    activeTextMuted = cleanHex(document.getElementById('pcTextMuted').value);
    activeLink = cleanHex(document.getElementById('pcLink').value);
  } else {
    activeBgMain = cleanHex(document.getElementById('cBgMainText').value);
    activeDark = cleanHex(document.getElementById('cBgDarkText').value);
    activeAccent = cleanHex(document.getElementById('cAccentText').value);
    activeTextMain = cleanHex(document.getElementById('cTextMainText').value);
    activeTextMuted = cleanHex(document.getElementById('cTextMutedText').value);
    activeLink = cleanHex(document.getElementById('cLinkText').value);
  }

  const mockApp = document.getElementById('mockApp');
  mockApp.style.backgroundColor = activeBgMain;

  applyVisualSliders(bgAlpha, bgBlur);
  validateAndApplyBg(bgUrl);

  // Mirror exact VaporousCreeper variable placements in the Live Preview
  document.getElementById('mockHeaderBar').style.color = activeTextMain;
  document.getElementById('mockHeaderBar').style.backgroundColor = rgbaStr(activeDark, 0.6);
  document.getElementById('mockHeaderBar').style.borderBottom = `2px solid ${rgbaStr(activeDark, 0.6)}`;

  const sidebar = document.getElementById('mockSidebar');
  sidebar.style.backgroundColor = rgbaStr(activeDark, 0.3);
  sidebar.style.color = activeTextMuted;

  const srvName = document.getElementById('mockServerName');
  srvName.style.backgroundColor = rgbaStr(activeDark, 0.6);
  srvName.style.color = activeTextMain;

  const activeChan = document.getElementById('mockChanActive');
  activeChan.style.backgroundColor = rgbaStr(activeBgMain, 0.5);
  activeChan.style.color = activeTextMain;

  const mutedChan1 = document.getElementById('mockChanMuted');
  mutedChan1.style.backgroundColor = rgbaStr(activeBgMain, 0.3);
  mutedChan1.style.color = activeTextMuted;

  const mutedChan2 = document.getElementById('mockChanMuted2');
  mutedChan2.style.backgroundColor = rgbaStr(activeBgMain, 0.3);
  mutedChan2.style.color = activeTextMuted;

  document.getElementById('mockCozyMsg').style.backgroundColor = rgbaStr(activeBgMain, 0.3);
  document.getElementById('mockUser').style.color = activeTextMain;
  document.getElementById('mockTime').style.color = activeTextMuted;
  document.getElementById('mockMsgText').style.color = activeTextMain;
  document.getElementById('mockLink').style.color = activeLink;

  const replyRow = document.getElementById('mockReplyRow');
  replyRow.style.backgroundColor = rgbaStr(activeDark, 0.6);
  replyRow.style.borderLeft = `3px solid ${activeAccent}`;
  document.getElementById('mockMutedSample').style.color = activeAccent;
  document.getElementById('mockNormalSample').style.color = activeTextMain;

  const mention = document.getElementById('mockMention');
  mention.style.backgroundColor = rgbaStr(activeDark, 0.6);
  mention.style.color = activeAccent;

  const inputBox = document.getElementById('mockInputBox');
  inputBox.style.backgroundColor = rgbaStr(activeDark, 0.6);
  inputBox.style.color = activeTextMuted;

  const themeName = document.getElementById('themeName').value;
  const themeDesc = document.getElementById('themeDesc').value;
  const authorName = document.getElementById('authorName').value;
  const authorId = document.getElementById('authorId').value;

  // Build Spec v2 JSON using mobile palette tokens
  const mBgMain = cleanHex(document.getElementById('cBgMainText').value);
  const mBgDark = cleanHex(document.getElementById('cBgDarkText').value);
  const mAccent = cleanHex(document.getElementById('cAccentText').value);
  const mTextMain = cleanHex(document.getElementById('cTextMainText').value);
  const mTextMuted = cleanHex(document.getElementById('cTextMutedText').value);
  const mLinkColor = cleanHex(document.getElementById('cLinkText').value);

  const themeObj = {
    name: themeName,
    description: themeDesc,
    version: "16.0.0",
    authors: [{ name: authorName, id: authorId }],
    semanticColors: {
      PANEL_BG: [ mBgMain ],
      CHAT_BACKGROUND: [ mBgMain ],
      BACKGROUND_ACCENT: [ mAccent ],
      BACKGROUND_FLOATING: [ mBgMain ],
      BACKGROUND_MENTIONED: [ mAccent + "33" ],
      CHANNELS_DEFAULT: [ mTextMuted ],
      TEXT_LINK: [ mLinkColor ],
      TEXT_MUTED: [ mTextMuted ],
      TEXT_NORMAL: [ mTextMain ],
      TEXT_PRIMARY: [ mTextMain ]
    },
    rawColors: {
      BRAND_500: mAccent,
      WHITE_500: mTextMain,
      WHITE_630: mTextMuted
    },
    background: { blur: bgBlur, url: bgUrl, alpha: bgAlpha },
    spec: 2
  };

  latestJsonString = JSON.stringify(themeObj, null, 4);

  // Build Vencord CSS using PC palette variables
  const pcActive = cleanHex(document.getElementById('pcActiveText').value);
  const pcP1 = cleanHex(document.getElementById('pcPri1').value);
  const pcP3 = cleanHex(document.getElementById('pcPri3').value);
  const pcS1 = cleanHex(document.getElementById('pcSec1').value);
  const pcS2 = cleanHex(document.getElementById('pcSec2').value);
  const pcS3 = cleanHex(document.getElementById('pcSec3').value);
  const pcS4 = cleanHex(document.getElementById('pcSec4').value);
  const pcTMuted = cleanHex(document.getElementById('pcTextMuted').value);
  const pcTLink = cleanHex(document.getElementById('pcLink').value);

  latestVencordCssString = buildVencordCss({
    themeName, themeDesc, authorName, authorId,
    pcActiveText: pcActive, pcPri1: pcP1, pcPri3: pcP3, pcSec1: pcS1, pcSec2: pcS2, pcSec3: pcS3, pcSec4: pcS4, pcTextMuted: pcTMuted, pcLink: pcTLink,
    bgUrl, bgAlpha, bgBlur
  });

  const outBox = document.getElementById('jsonOutput');
  outBox.value = currentOutputMode === 'css' ? latestVencordCssString : latestJsonString;
  saveStateToStorage();
}

function initApp() {
  if (location.protocol === 'chrome-extension:') {
    const banner = document.getElementById('extDownloadBanner');
    if (banner) banner.style.display = 'none';
  }

  document.getElementById('tabJsonBtn').addEventListener('click', () => setOutputMode('json'));
  document.getElementById('tabCssBtn').addEventListener('click', () => setOutputMode('css'));
  document.getElementById('paletteMobileBtn').addEventListener('click', () => setPaletteMode('mobile'));
  document.getElementById('palettePcBtn').addEventListener('click', () => setPaletteMode('pc'));

  const importInput = document.getElementById('importJsonFile');
  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        loadThemeFromString(ev.target.result);
        importInput.value = '';
      };
      reader.readAsText(file);
    });
  }

  document.body.addEventListener('dragover', (e) => {
    e.preventDefault();
    document.body.classList.add('drag-over');
  });
  document.body.addEventListener('dragleave', () => {
    document.body.classList.remove('drag-over');
  });
  document.body.addEventListener('drop', (e) => {
    e.preventDefault();
    document.body.classList.remove('drag-over');
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;

    const lower = file.name.toLowerCase();
    if (lower.endsWith('.json') || lower.endsWith('.css') || file.type === 'application/json' || file.type === 'text/css') {
      const reader = new FileReader();
      reader.onload = (ev) => loadThemeFromString(ev.target.result);
      reader.readAsText(file);
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        localPreviewDataUrl = ev.target.result;
        updateTheme();
        showFeedbackStatus('Dropped Image Loaded!', false);
      };
      reader.readAsDataURL(file);
    }
  });

  const parsePastedBtn = document.getElementById('parsePastedBtn');
  if (parsePastedBtn) {
    parsePastedBtn.addEventListener('click', () => {
      const rawText = document.getElementById('jsonOutput').value.trim();
      if (rawText) loadThemeFromString(rawText);
    });
  }

  // Bind Mobile Color Pairs
  const mobileColorPairs = [
    ['cBgMainPicker', 'cBgMainText'],
    ['cBgDarkPicker', 'cBgDarkText'],
    ['cAccentPicker', 'cAccentText'],
    ['cTextMainPicker', 'cTextMainText'],
    ['cTextMutedPicker', 'cTextMutedText'],
    ['cLinkPicker', 'cLinkText']
  ];
  mobileColorPairs.forEach(([pickerId, textId]) => {
    const picker = document.getElementById(pickerId);
    const text = document.getElementById(textId);
    picker.addEventListener('input', () => { text.value = picker.value.toUpperCase(); updateTheme(); });
    text.addEventListener('input', () => {
      let val = text.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) { picker.value = val; updateTheme(); }
    });
  });

  // Bind PC Color Pairs
  const pcColorPairs = [
    ['pcActiveTextPicker', 'pcActiveText'],
    ['pcPri1Picker', 'pcPri1'],
    ['pcPri3Picker', 'pcPri3'],
    ['pcSec1Picker', 'pcSec1'],
    ['pcSec2Picker', 'pcSec2'],
    ['pcSec3Picker', 'pcSec3'],
    ['pcSec4Picker', 'pcSec4'],
    ['pcTextMutedPicker', 'pcTextMuted'],
    ['pcLinkPicker', 'pcLink']
  ];
  pcColorPairs.forEach(([pickerId, textId]) => {
    const picker = document.getElementById(pickerId);
    const text = document.getElementById(textId);
    picker.addEventListener('input', () => { text.value = picker.value.toUpperCase(); updateTheme(); });
    text.addEventListener('input', () => {
      let val = text.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) { picker.value = val; updateTheme(); }
    });
  });

  ['themeName', 'themeDesc', 'authorName', 'authorId'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateTheme);
  });

  document.getElementById('bgUrl').addEventListener('input', () => {
    localPreviewDataUrl = null;
    lastTestedUrl = null;
    updateTheme();
  });

  document.getElementById('fallbackPreset').addEventListener('change', () => {
    localPreviewDataUrl = null;
    if (currentBgState === 'error') {
      showAnimeFallback(true);
    }
    saveStateToStorage();
  });

  document.getElementById('localBgInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      localPreviewDataUrl = ev.target.result;
      updateTheme();
    };
    reader.readAsDataURL(file);
  });

  const alphaSlider = document.getElementById('bgAlpha');
  const blurSlider = document.getElementById('bgBlur');
  ['input', 'change'].forEach(evt => {
    alphaSlider.addEventListener(evt, updateTheme);
    blurSlider.addEventListener(evt, updateTheme);
  });

  document.getElementById('copyBtn').addEventListener('click', () => {
    setOutputMode('json');
    navigator.clipboard.writeText(latestJsonString);
    const btn = document.getElementById('copyBtn');
    btn.textContent = 'Copied JSON!';
    setTimeout(() => { btn.textContent = 'Copy JSON'; }, 2000);
  });

  document.getElementById('downloadBtn').addEventListener('click', () => {
    const name = document.getElementById('themeName').value.trim().replace(/\s+/g, '_') || 'illusive_theme';
    const blob = new Blob([latestJsonString], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.json`;
    a.click();
  });

  document.getElementById('copyCssBtn').addEventListener('click', () => {
    setOutputMode('css');
    navigator.clipboard.writeText(latestVencordCssString);
    const btn = document.getElementById('copyCssBtn');
    btn.textContent = '✅ Copied Vencord CSS!';
    setTimeout(() => { btn.textContent = '✨ Copy Vencord CSS'; }, 2000);
  });

  document.getElementById('downloadCssBtn').addEventListener('click', () => {
    setOutputMode('css');
    const name = document.getElementById('themeName').value.trim().replace(/\s+/g, '_') || 'illusive_theme';
    const blob = new Blob([latestVencordCssString], { type: 'text/css' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.theme.css`;
    a.click();
  });

  const dlExtBtn = document.getElementById('dlExtFilesBtn');
  if (dlExtBtn) {
    dlExtBtn.addEventListener('click', () => {
      const triggerDl = (filename, content, mime) => {
        const b = new Blob([content], { type: mime });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = filename;
        a.click();
      };

      const jsContent = document.getElementById('mainAppScript').textContent.trim();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = PRISTINE_BODY;
      const bnr = tempDiv.querySelector('#extDownloadBanner');
      if (bnr) bnr.remove();

      const htmlContent = [
        '<!DOCTYPE html>',
        '<html lang="en">',
        '<head>',
        '  <meta charset="UTF-8">',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0">',
        '  <title>iLLusive Studio — Theme Builder</title>',
        '  <style>' + PRISTINE_STYLE + '</style>',
        '</head>',
        '<body>',
        tempDiv.innerHTML,
        '<script src="popup.js"><' + '/script>',
        '</body>',
        '</html>'
      ].join('\n');

      const bgServiceWorkerContent = [
        '// Opens the iLLusive Theme Builder in the persistent Side Panel when clicking the toolbar icon',
        'chrome.sidePanel',
        '  .setPanelBehavior({ openPanelOnActionClick: true })',
        '  .catch((error) => console.error(error));'
      ].join('\n');

      const manifestContent = JSON.stringify({
        manifest_version: 3,
        name: "iLLusive Studio — Theme Builder",
        version: "2.8.0",
        description: "Persistent Side Panel Spec v2 Discord Theme Engine + Vencord CSS Converter",
        permissions: [
          "clipboardWrite",
          "sidePanel",
          "storage"
        ],
        background: {
          service_worker: "background.js"
        },
        action: {
          default_title: "Open iLLusive Theme Builder Side Panel"
        },
        side_panel: {
          default_path: "popup.html"
        }
      }, null, 2);

      triggerDl('manifest.json', manifestContent, 'application/json');
      setTimeout(() => triggerDl('background.js', bgServiceWorkerContent, 'text/javascript'), 250);
      setTimeout(() => triggerDl('popup.html', htmlContent, 'text/html'), 500);
      setTimeout(() => triggerDl('popup.js', jsContent, 'text/javascript'), 750);
    });
  }

  updateTheme();
  restoreStateFromStorage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}