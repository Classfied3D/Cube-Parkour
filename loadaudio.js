/* Copyright (C) 2025 Classfied3D
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * See LICENSE for full license text.
 */

const endpos = 66.2;
const repeatpos = 34.3;
let playing = false;
let theme;
let audio;

async function startAudio() {
  try {
    await theme.play();
    playing = true;
    return playing;
  } catch(e) {
    return null;
  }
}

async function audioLoad() {
  localStorage.theme = audio;
  theme = new Audio(audio);

  startAudio();

  document.onclick = startAudio;

  setInterval(() => {
    if (theme.currentTime > endpos) {
      theme.pause();
      setTimeout(() => {
        theme.currentTime = repeatpos;
        theme.play();
      }, 15);
    }
  }, 2);
}

if (window.self === window.top) { // Don't play in iframe
  if (!localStorage.theme) {
    const script = document.createElement("script");
    script.src = "/assets/audio.js";
    script.onload = audioLoad;
    document.getElementsByTagName("body")[0].appendChild(script);
  } else {
    audio = localStorage.theme;
    audioLoad();
  }
}