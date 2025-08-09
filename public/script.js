/* Copyright (C) 2025 Classfied3D
 * SPDX-License-Identifier: GPL-3.0-or-later
 *
 * See LICENSE for full license text.
 */

import * as THREE from "three";
import {PointerLockControls} from "three/pointerlock";

const IFRAME_REDIRECT = "https://cube-parkour.classfied3d.repl.co/";
const SERVER_URL = "https://cube-parkour-leaderboard.classfied3d.repl.co";

const FONT_FILE = "https://fonts.gstatic.com/s/sofiasans/v10/Yq6E-LCVXSLy9uPBwlAThu1SY8Cx8rlT69B6sJ3qpPOgW08lfLY.woff2";
const FONT_NAME = "Sofia Sans";

const AUDIO_URL = "https://cdn.jsdelivr.net/gh/Classfied3D/Cube-Parkour@f353609/public/audio/theme1.mp3";
const END_POS = 66.17;
const REPEAT_POS = 34.3;

const DEBUG = false;

const FPS_INTERVAL = 1000 / 60;
const FPS_CAP = true;

const MAX_LEVEL = 6;

let width = window.innerWidth;
let height = window.innerHeight;

const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
renderer.physicallyCorrectLights = true;
renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor("lightblue");

const canvasText = document.getElementById("ctext");
canvasText.width = width;
canvasText.height = height;
let ctx = canvasText.getContext("2d");
ctx.fillStyle = "#ffffff";
ctx.font = `35px "${FONT_NAME}"`;
ctx.textAlign = "center";

const scene = new THREE.Scene();
/*const loader = new THREE.CubeTextureLoader();
loader.setPath("assets/skybox/spacelightblue/");
const skybox = loader.load([
	"right.png", "left.png",
  "top.png", "bot.png",
  "front.png", "back.png",
]);
scene.background = skybox;*/

const camera = new THREE.PerspectiveCamera(65, width / height, 1, 1000);
const controls = new PointerLockControls(camera, document.body);

let collisions = [];
let sightCollisions = [];

const platforms = []; // regular platform
const movingX = []; // moving platform (x-axis)
const movingY = []; // moving platform (y-axis)
const movingZ = []; // moving platform (z-axis)
const trampolines = []; // trampoline (jump high)
const enemies = []; // enemy (AI moving cube that kills you on touch. Cannot jump, slow but can use moving/falling platforms)
const jumpingEnemies = []; // jumping enemy (AI moving cube that kills you on touch. Slow, but can jump, and can use moving/falling platforms)
const bosses = []; // boss
const rings = []; // rings that kill you on touch. Expand and delete themselves
const lava = []; // platform that kills you
const unstables = []; // platforms that start falling on touch
const falling = []; // platforms that are falling
const slowFalling = []; // platforms that are falling slowly (this is used for when the boss sinks into the lava)
const keys = []; // keys that are collected to complete the level
const ices = []; // platforms with ice physics
const lights = []; // lights
const playerLights = []; // light that follows the player
const nonSolids = []; // platforms that can be walked through but can be seen
const invisible = []; // invisible platforms
const triggers = []; // trigger which initiates the boss
const teleporters = []; // teleporters

function addPlatform(color, x, y, z, width, height, depth, type, invisible=false, setLighting=null, data={}) {
  let platform;
  setLighting = setLighting === null ? lighting : setLighting;
  if (!setLighting) {
    platform = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshBasicMaterial({color: color}),
    );
    platform.castShadow = false;
  } else {
    platform = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({color: color}),
    );
  }
  platform.position.set(x, y, z);
  platform.data = data; // Yeah I uh didnt bother with js objects when I wrote this (whatever it works)
  if (!invisible) {
    scene.add(platform);
  }
  type.push(platform);
}

function addLight(color, x, y, z, power, decay, rotation, type) {
  const light = new THREE.PointLight(color, 100);
  light.position.set(x, y, z);
  light.power = power;
  light.decay = decay;
  light.distance = Infinity;
  light.rotation.y = rotation*(Math.PI/180);
  scene.add(light);
  type.push(light);
}

function addLightRect(color, x, y, z, width, height, power, decay, rotation, type) {
  const light = new THREE.PointLight(color, 100, width, height);
  light.position.set(x, y, z);
  light.power = power;
  light.decay = decay;
  light.distance = Infinity;
  light.rotation.z = rotation*(Math.PI/180);
  scene.add(light);
  type.push(light);
}

function addLava(x, y, z, width, height, depth) {
  addPlatform("orange", x, y, z, width, height, depth, lava, false, false);
  //addLightRect("orange", x, y+(height/2)+0.1, z, width, depth, 600, 2, 180, lights);
}

function addRing(color, x, y, z, radius, tube, type) {
  const platform = new THREE.Mesh(
    new THREE.TorusGeometry(radius, tube, 16, 100),
    new THREE.MeshBasicMaterial({color: color}),
  );
  platform.position.set(x, y, z);
  platform.rotation.x = Math.PI/2;
  scene.add(platform);
  type.push(platform);
}

function removeObject(object) {
  object.geometry.dispose();
  object.material.dispose();
  scene.remove(object);
}

function setup(level) {
  tutorial = "";
  x = z = xVel = zVel = gravity = tick = 0;
  y = 1;
  character.position.set(x, y, z);
  camera.rotation.x = Math.PI / 7;
  camera.rotation.y = Math.PI;
  camera.rotation.z = 0;
  doRender = true;
  
  for (let platform of platforms) removeObject(platform);
  for (let trampoline of trampolines) removeObject(trampoline);
  for (let nonSolid of nonSolids) removeObject(nonSolid);
  for (let obj of lava) removeObject(obj);
  for (let ring of rings) removeObject(ring);
  for (let unstable of unstables) removeObject(unstable);
  for (let fall of falling) removeObject(fall);
  for (let slowFall of slowFalling) removeObject(slowFall);
  for (let moveX of movingX) removeObject(moveX);
  for (let moveY of movingY) removeObject(moveY);
  for (let moveZ of movingZ) removeObject(moveZ);
  for (let light of lights) removeObject(light);
  for (let light of playerLights) scene.remove(light);
  for (let trigger of triggers) removeObject(trigger);
  for (let ice of ices) removeObject(ice);
  for (let teleporter of teleporters) removeObject(teleporter);
  platforms.splice(0, platforms.length);
  trampolines.splice(0, trampolines.length);
  lava.splice(0, lava.length);
  rings.splice(0, rings.length);
  unstables.splice(0, unstables.length);
  falling.splice(0, falling.length);
  slowFalling.splice(0, slowFalling.length);
  nonSolids.splice(0, nonSolids.length);
  invisible.splice(0, invisible.length);
  movingX.splice(0, movingX.length);
  movingY.splice(0, movingY.length);
  movingZ.splice(0, movingZ.length);
  lights.splice(0, lights.length);
  playerLights.splice(0, playerLights.length);
  triggers.splice(0, triggers.length);
  ices.splice(0, ices.length);
  teleporters.splice(0, teleporters.length);

  setLighting(level);
  
  if (level == 1) {
    tutorial = "Move the mouse to look around";
    addPlatform("green", 0, 0, 0, 1.5, 1, 1.5, platforms);
    addPlatform("green", 0, 0, 3, 1.5, 1, 1.5, platforms);
    addPlatform("green", 0, 1, 10, 1.5, 1, 1.5, platforms);
    addPlatform("green", 5, 1.5, 15, 1.5, 1, 1.5, platforms);
    addPlatform(0xc7c934, 10, -3, 15, 1.5, 1, 1.5, trampolines);
    addPlatform("green", 10, 10, 10, 1.5, 1, 1.5, platforms);
    addPlatform("green", 10, 12, 5, 1.5, 1, 1.5, platforms);
    addPlatform("green", 15, 14, 5, 1.5, 1, 1.5, platforms);
    addPlatform("green", -6, -3, 10, 1.5, 1, 1.5, platforms);
    addPlatform("green", -13, -5, 6, 1.5, 1, 1.5, platforms);
    addPlatform(0xc7c934, -13, -5, 0, 1.5, 1, 1.5, trampolines);
    addPlatform("green", 10, 5.5, 18, 1.5, 1, 1.5, platforms);
    addPlatform("green", 10, 5.5, 26.5, 1.5, 1, 1.5, platforms);
    addPlatform("green", 10, 5.5, 35, 1.5, 1, 1.5, platforms);
  } else if (level == 2) {
    tutorial = "Go around corners to hide from enemies";
    addPlatform("black", 0, 0, 0, 50, 1, 50, platforms);
    addPlatform("green", 3, 2.5, 5, 1, 4, 20, platforms);
    addPlatform("green", -3, 2.5, 1.75, 1, 4, 26.5, platforms);
    addPlatform("green", 0, 2.5, -5.5, 7, 4, 1, platforms);
    addPlatform("green", 0, 2.5, 20, 19, 4, 1, platforms);
    addPlatform("green", 9, 2.5, 10, 1, 4, 21, platforms);
    addPlatform("green", -9, 2.5, 4.5, 1, 4, 32, platforms);
    addPlatform("green", 13, 2.5, 0, 9, 4, 1, platforms);
    addPlatform("green", 15, 2.5, -6, 13, 4, 1, platforms);
    addPlatform("green", 22, 2.5, -0.5, 1, 4, 12, platforms);
    addPlatform("green", 16, 2.5, 6, 13, 4, 1, platforms);
    addPlatform("green", 0.5, 2.5, -11, 18, 4, 1, platforms);
    addPlatform("green", 9, 2.5, -8.5, 1, 4, 4, platforms);
  } else if (level == 3) {
    addPlatform("green", 0, 0, 0, 1.5, 1, 1.5, platforms);
    addPlatform("green", 0, 1, 6, 1.5, 1, 1.5, movingY);
    addPlatform(0xc7c934, 3, 7, 10, 1.5, 1, 1.5, trampolines);
    addPlatform("green", 7, 17, 10, 1.5, 1, 1.5, movingY);
    addPlatform("dimgray", 15, 20, 10, 7, 1, 7, platforms);
    addPlatform("green", 22, 21, 10, 1.5, 1, 1.5, movingY);
    addPlatform(0xc7c934, 22, 27, 7, 1.5, 1, 1.5, trampolines);
    addPlatform("green", 22, 35, -8, 1.5, 1, 1.5, platforms);
    addPlatform("green", 16, 37, -8, 1.5, 1, 1.5, platforms);
    addPlatform("green", 10, 39, -8, 1.5, 1, 1.5, platforms);
    addPlatform("green", 4, 41, -8, 1.5, 1, 1.5, platforms);
    addPlatform("black", 1, 41, -8, 2.5, 1, 9, movingX);
    addPlatform("green", -3, 43.5, -8, 1, 4, 3, platforms);
    addPlatform("green", -3, 43.5, -5, 1, 4, 3, platforms);
    addPlatform("green", -6, 43.5, -8, 1, 4, 3, platforms);
    addPlatform("green", -6, 43.5, -11, 1, 4, 3, platforms);
    addPlatform("green", -9, 43.5, -8, 1, 4, 3, platforms);
    addPlatform("green", -9, 43.5, -5, 1, 4, 3, platforms);
    addPlatform("green", -15, 42, -8, 1.5, 1, 1.5, platforms);
    addPlatform("green", -15, 44, -2, 1.5, 1, 1.5, platforms);
    addPlatform("green", -15, 46, 4, 1.5, 1, 1.5, platforms);
    addPlatform(0xc7c934, -15, 48, 10, 1.5, 1, 1.5, trampolines);
    addPlatform("dimgray", -15, 50, 25, 15, 1, 15, platforms);
    addPlatform("dimgray", -15, 49.9, 25, 15, 1, 15, platforms);
    addPlatform("gray", -22, 53, 25, 1, 5, 15, platforms);
    addPlatform("gray", -8, 53, 25, 1, 5, 15, platforms);
    addPlatform("gray", -15, 53, 32, 15, 5, 1, platforms);
    addPlatform("gray", -15, 53, 18, 15, 5, 1, platforms);
    addPlatform("green", -9.75, 50, 25, 1.5, 1, 1.5, movingY);
    addPlatform("green", -20.25, 50, 25, 1.5, 1, 1.5, movingY);
    addPlatform("green", -15, 50, 19.75, 1.5, 1, 1.5, movingY);
    addPlatform("green", -15, 50, 30.25, 1.5, 1, 1.5, movingY);
  } else if (level == 4) {
    tutorial = "Escape the dungeon without being caught";
    addPlatform("black", 0, 0, 0, 50, 1, 50, platforms);
    addPlatform("gray", 2, 0, -5, 1, 10, 20, platforms);
    addPlatform("gray", -2, 0, -5, 1, 10, 20, platforms);
    addPlatform("gray", 0, 0, 5, 5, 10, 0.2, invisible, true);
    for (let i = 2; i > -2; i -= 0.3) {
      addPlatform("lightgray", i, 0, 5, 0.1, 10, 0.1, platforms);
    }
    addPlatform("lightgray", 0, 2, 5, 4, 0.1, 0.1, platforms);
    addPlatform("lightgray", 0, 4, 5, 4, 0.1, 0.1, platforms);
    addPlatform("gray", 0, 0, -5.5, 3, 4, 1, platforms);
    addPlatform("gray", 1.75, 0, -5.5, 1.5, 10, 1, platforms);
    addPlatform("gray", -1.75, 0, -5.5, 1.5, 10, 1, platforms);
    addPlatform("gray", 0, 5.4, -5.5, 3, 4, 1, platforms);
    addPlatform("gray", 0.75, 2.1, -5.5, 0.5, 0.2, 1, nonSolids);
    addPlatform("gray", -0.25, 2.1, -5.5, 0.5, 0.2, 1, nonSolids);
    addPlatform("gray", -0.75, 2.1, -5.5, 0.5, 0.2, 1, nonSolids);
    addPlatform("gray", -0.75, 2.3, -5.5, 0.5, 0.2, 1, nonSolids);
    addPlatform("gray", -0.75, 3.1, -5.5, 0.5, 0.2, 1, nonSolids);
    addPlatform("gray", -0.75, 3.3, -5.5, 0.5, 0.2, 1, nonSolids);
    addPlatform("gray", -0.25, 3.3, -5.5, 0.5, 0.2, 1, nonSolids);
    addPlatform("gray", 0.75, 3.3, -5.5, 0.5, 0.2, 1, nonSolids);
    addPlatform("gray", 0, 5.5, 0, 50, 1, 50, platforms);
    for (let i = -15; i > -19; i -= 0.3) {
      addPlatform("lightgray", -2, 0, i, 0.1, 10, 0.1, platforms);
    }
    addPlatform("lightgray", -2, 2, -17, 0.1, 0.1, 4, platforms);
    addPlatform("lightgray", -2, 4, -17, 0.1, 0.1, 4, platforms);
    addPlatform("gray", -2, 0, -17, 0.4, 10, 4, invisible, true);
    addPlatform("gray", 0, 0, -22, 50, 10, 1, platforms);
    addPlatform("gray", 6.5, 0, -15, 10, 10, 1, platforms);
    addPlatform("gray", -6.5, 0, -15, 10, 10, 1, platforms);
    addPlatform("gray", -10, 0, -20, 1, 10, 10, platforms);
    addPlatform("gray", 15, 0, -15, 1, 10, 21, platforms);
    addPlatform("gray", 13.5, 0, -5, 10, 10, 1, platforms);
    addPlatform("gray", 11, 0, -12, 1, 10, 5, platforms);
    addPlatform("gray", 6.5, 0, -10, 8, 10, 1, platforms);
    addPlatform("gray", 9, 0, 5.5, 1, 10, 20, platforms);
    addPlatform("gray", 0, 0, 10.5, 50, 10, 1, platforms);
    addPlatform("gray", -10, 0, 5.5, 1, 10, 10, platforms);
    addPlatform("gray", -13.75, 2.75, -4.75, 22.5, 4.5, 1, platforms);
    addPlatform("gray", -17.25, 2.75, 0, 15.5, 4.5, 1, platforms);
    addPlatform("gray", -24.5, 0.6, -0.75, 1, 0.2, 0.5, nonSolids);
    addPlatform("gray", -24.5, 0.8, -0.75, 1, 0.2, 0.5, nonSolids);
    addPlatform("gray", -24.5, 1, -0.75, 1, 0.2, 0.5, nonSolids);
    addPlatform("gray", -24.5, 1.2, -0.75, 1, 0.2, 0.5, nonSolids);
    addPlatform("gray", -24.5, 0.6, -1.25, 1, 0.2, 0.5, nonSolids);
    addPlatform("gray", -24.5, 4.9, -0.75, 1, 0.2, 0.5, nonSolids);
    addPlatform("gray", -24.5, 4.9, -1.25, 1, 0.2, 0.5, nonSolids);
    addPlatform("gray", -24.5, 4.7, -0.75, 1, 0.2, 0.5, nonSolids);
    addPlatform("gray", -24.5, 0.6, -4, 1, 0.2, 0.5, nonSolids);
    addPlatform("gray", -24.5, 0.8, -4, 1, 0.2, 0.5, nonSolids);
    addPlatform("gray", -24.5, 0.6, -3.5, 1, 0.2, 0.5, nonSolids);
    addPlatform("gray", -24.5, 4.9, -4, 1, 0.2, 0.5, nonSolids);
    addPlatform("gray", -24.5, 2.75, -15, 1, 4.5, 20, platforms);
    addPlatform("gray", -24.5, 2.75, 12.5, 1, 4.5, 25, platforms);
    addLava(0, -1, 0, 1000, 1, 1000);
    addPlatform("black", -29, 0, -2.375, 1.5, 1, 1.5, platforms);
    addPlatform("black", -35, 0, -2.375, 1.5, 1, 1.5, platforms);
    addPlatform("black", -39, 0, -7, 1.5, 1, 1.5, platforms);
    addPlatform(0x361704, -45, 0, -9, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -53, 0, -12, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -61, 0, -16, 1.5, 1, 1.5, unstables, false, false);
    addPlatform("black", -69, 0, -17, 1.5, 1, 1.5, platforms);
    addPlatform(0x361704, -73, 0, -17, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -73, 0, -13, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -73, 0, -9, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -73, 0, -5, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -73, 0, -1, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -77, 0, -13, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -77, 0, -9, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -77, 0, -5, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -77, 0, -1, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -77, 0, 3, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -81, 0, 3, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -81, 0, -5, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -81, 0, -13, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -81, 0, -17, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -85, 0, -17, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -85, 0, -13, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -85, 0, -9, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -85, 0, -5, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -85, 0, -1, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -85, 0, 3, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -89, 0, 3, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -89, 0, -1, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -89, 0, -9, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -89, 0, -13, 1.5, 1, 1.5, unstables, false, false);
    addPlatform(0x361704, -89, 0, -17, 1.5, 1, 1.5, unstables, false, false);
    addPlatform("black", -89, 0, -25.75, 1.5, 1, 1.5, platforms);
    addPlatform("black", -89, 0, -29.75, 1.5, 1, 1.5, platforms);
    addPlatform("black", -82, 0, -29.75, 1.5, 1, 1.5, platforms);
    addPlatform("black", -75, 0, -29.75, 1.5, 1, 1.5, platforms);
    addPlatform("black", -68, 0, -29.75, 1.5, 1, 1.5, platforms);
    addPlatform("black", -61, 0, -29.75, 1.5, 1, 1.5, platforms);
    addPlatform("black", -54, 0, -29.75, 1.5, 1, 1.5, platforms);
    addPlatform("black", -47, 0, -29.75, 1.5, 1, 1.5, platforms);
    addPlatform("black", -40, 0, -29.75, 1.5, 1, 1.5, platforms);
    addPlatform("black", -33, 0, -29.75, 1.5, 1, 1.5, platforms);
    addPlatform("black", -33, 0, -25.75, 1.5, 1, 1.5, platforms);
    addPlatform("black", -33, 0, -21.75, 1.5, 1, 1.5, platforms);
    addPlatform(0xc7c934, -33, 0, -17.75, 1.5, 1, 1.5, trampolines, false, false);
  } else if (level == 5) {
    tutorial = "Defeat the boss to complete the level";
    addPlatform("black", 0, 0, 0, 1.5, 1, 1.5, platforms);
    addPlatform("black", 0, 0, 60, 1.5, 1, 1.5, platforms);
    addPlatform("black", 30, 0, 30, 1.5, 1, 1.5, platforms);
    addPlatform("black", -30, 0, 30, 1.5, 1, 1.5, platforms);
    addLava(0, -1, 0, 1000, 1, 1000);
    addPlatform(0x361704, 0, 0, 5, 1.5, 1, 1.5, unstables);
    addPlatform(0x361704, 0, 0, 10, 1.5, 1, 1.5, unstables);
    addPlatform(0x361704, 0, 0, 15, 1.5, 1, 1.5, unstables);
    addPlatform("black", 0, 0, 30, 20, 1, 20, platforms);
    addPlatform("black", 0, 1, 30, 20, 1, 20, triggers, true);
  } else if (level == 6) {
    addPlatform(0xc2f1ff, 0, 0, 0, 10, 1, 10, ices);
    addPlatform(0xc2f1ff, 0, 1, 10, 1.5, 1, 1.5, ices);
    addPlatform(0xc2f1ff, -4, 1, 18, 1.5, 1, 1.5, ices);
    addPlatform(0xc2f1ff, -5, 1, 27, 1.5, 1, 1.5, ices);
    addPlatform(0xc2f1ff, 7, 1, 27, 1.5, 1, 1.5, platforms);
    addPlatform(0xc2f1ff, -4, 1, 36, 1.5, 1, 1.5, ices);
    addPlatform(0xdbde33, -11, 1, 0, 1.5, 1, 1.5, trampolines);
    addPlatform("green", -15, 13, 0, 1.5, 1, 1.5, movingY);
    addPlatform("green", -8, 19, 0, 1.5, 1, 1.5, platforms);
    addPlatform("green", 0, 20, 0, 1.5, 1, 1.5, platforms);
    addPlatform("green", 4, 22, 4, 1.5, 1, 1.5, platforms);
    addPlatform("green", 8, 24, 0, 1.5, 1, 1.5, platforms);
    addPlatform("green", 4, 26, -4, 1.5, 1, 1.5, platforms);
    addPlatform("green", 0, 28, 0, 1.5, 1, 1.5, platforms);
    addPlatform("green", 4, 30, 4, 1.5, 1, 1.5, platforms);
    addPlatform("green", 8, 32, 0, 1.5, 1, 1.5, platforms);
    addPlatform("green", 4, 34, -4, 1.5, 1, 1.5, platforms);
    addPlatform(0x361704, 9, 36, -4, 1.5, 1, 1.5, unstables);
    addPlatform(0x361704, 17, 36, -4, 1.5, 1, 1.5, unstables);
    addPlatform(0x361704, 25, 36, -4, 1.5, 1, 1.5, unstables);
    addPlatform(0x361704, 33, 36, -4, 1.5, 1, 1.5, unstables);
    addPlatform("green", 41, 36, -4, 1.5, 1, 1.5, platforms);
    addPlatform(0xcc55d9, 41, 37, -4, 0.4, 0.4, 0.4, teleporters, false, null, {tpx: 50, tpy: 10, tpz: 50});
    addPlatform("green", 39, 1.5, 0, 1.5, 1, 1.5, platforms);
    addPlatform("green", 48.3, 1.5, 0, 1.5, 1, 1.5, platforms);
    addPlatform("green", 57.6, 1.5, 0, 1.5, 1, 1.5, platforms);
    addPlatform(0xcc55d9, 57.8, 2.5, 0, 0.4, 0.4, 0.4, teleporters, false, null, {tpx: 0, tpy: 10, tpz: 0});
    addPlatform("green", 50, 0, 50, 1.5, 1, 1.5, platforms);
    addPlatform("green", 42, 0, 50, 1.5, 1, 1.5, platforms);
    addPlatform("green", 34, 0, 50, 1.5, 1, 1.5, platforms);
    addPlatform("green", 50, 0, 42, 1.5, 1, 1.5, platforms);
    addPlatform(0xcc55d9, 50, 1, 42, 0.4, 0.4, 0.4, teleporters, false, null, {tpx: 0, tpy: 10, tpz: 0});
    addPlatform(0xc2f1ff, 0, 0, -12, 1.5, 1, 1.5, ices);
    addPlatform(0xcc55d9, -3, -47, -17.5, 0.4, 0.4, 0.4, teleporters, false, null, {tpx: 0, tpy: 10, tpz: 0});
  } else {
    addPlatform("green", 0, 0, 0, 1.5, 1, 1.5, platforms);
  }
  resetKeys(level);
  if (enableEnemies) {
    resetEnemies(level);
  }
  updateCollisions();
}

function updateCollisions() {
  collisions = [];
  collisions = collisions.concat(platforms);
  collisions = collisions.concat(trampolines);
  collisions = collisions.concat(invisible);
  collisions = collisions.concat(unstables);
  collisions = collisions.concat(falling);
  collisions = collisions.concat(ices);
  collisions = collisions.concat(movingX);
  collisions = collisions.concat(movingY);
  collisions = collisions.concat(movingZ);
  sightCollisions = collisions.concat(nonSolids).concat(lava);
}

function resetKeys(level) {
  keysCount = 0;
  keysGoal = 0;
  for (let key of keys) removeObject(key);
  keys.splice(0, keys.length);
  if (level == 1) {
    addPlatform("darkorange", 15, 15, 5, 0.4, 0.4, 0.4, keys);
    addPlatform("darkorange", -13, 0, 0, 0.4, 0.4, 0.4, keys);
    addPlatform("darkorange", 10, 6.5, 35, 0.4, 0.4, 0.4, keys);
  } else if (level == 2) {
    addPlatform("darkorange", -1, 1, -8.25, 0.4, 0.4, 0.4, keys);
    addPlatform("darkorange", 13, 1, 3, 0.4, 0.4, 0.4, keys);
    addPlatform("darkorange", -6, 1, -8.25, 0.4, 0.4, 0.4, keys);
  } else if (level == 3) {
    addPlatform("darkorange", -15, 51, 25, 0.4, 0.4, 0.4, keys);
  } else if (level == 4) {
    addPlatform("darkorange", -73, 1, -17, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -73, 1, -13, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -73, 1, -9, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -73, 1, -5, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -73, 1, -1, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -77, 1, -13, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -77, 1, -9, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -77, 1, -5, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -77, 1, -1, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -77, 1, 3, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -81, 1, 3, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -81, 1, -5, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -81, 1, -13, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -81, 1, -17, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -85, 1, -17, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -85, 1, -13, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -85, 1, -9, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -85, 1, -5, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -85, 1, -1, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -85, 1, 3, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -89, 1, 3, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -89, 1, -1, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -89, 1, -9, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -89, 1, -13, 0.4, 0.4, 0.4, keys, false, false);
    addPlatform("darkorange", -89, 1, -17, 0.4, 0.4, 0.4, keys, false, false);
  } else if (level == 5) {
    addPlatform("darkorange", 30, 1, 30, 0.4, 0.4, 0.4, keys);
    addPlatform("darkorange", -30, 1, 30, 0.4, 0.4, 0.4, keys);
    addPlatform("darkorange", 0, 1, 60, 0.4, 0.4, 0.4, keys);
  } else if (level == 6) {
    addPlatform("darkorange", -4, 2, 36, 0.4, 0.4, 0.4, keys);
    addPlatform("darkorange", 39, 2.5, 0, 0.4, 0.4, 0.4, keys);
    addPlatform("darkorange", 34, 1, 50, 0.4, 0.4, 0.4, keys);
    addPlatform("darkorange", 0, 0, -15, 0.4, 0.4, 0.4, keys);
    addPlatform("darkorange", -5, -12, -20, 0.4, 0.4, 0.4, keys);
    addPlatform("darkorange", -3, -40, -17.5, 0.4, 0.4, 0.4, keys);
  }
  keysGoal = keys.length;
}

function resetEnemies(level) {
  bossFightStarted = false;
  bossTick = 0;
  bossWave = 0;
  for (let enemy of enemies) removeObject(enemy);
  for (let enemy of jumpingEnemies) removeObject(enemy);
  for (let boss of bosses) removeObject(boss);
  enemies.splice(0, enemies.length);
  jumpingEnemies.splice(0, jumpingEnemies.length);
  bosses.splice(0, bosses.length);
  if (level == 2) {
    addPlatform("blue", 0, 1, 17.5, 1, 1, 1, enemies);
    addPlatform("blue", 12, 1, -3, 1, 1, 1, enemies);
    addPlatform("blue", 0, 1, -8.25, 1, 1, 1, enemies);
    addPlatform("blue", -6, 1, -6, 1, 1, 1, enemies);
  } else if (level == 3) {
    addPlatform("blue", 15, 21, 10, 1, 1, 1, enemies);
    addPlatform("blue", -8, 56, 25, 1, 1, 1, enemies);
    addPlatform("blue", -22, 56, 25, 1, 1, 1, enemies);
    addPlatform("blue", -15, 56, 18, 1, 1, 1, enemies);
    addPlatform("blue", -15, 56, 32, 1, 1, 1, enemies);
  } else if (level == 4) {
    addPlatform("blue", 0, 1, 7, 1, 1, 1, enemies);
    addPlatform("blue", -4, 1, -17, 1, 1, 1, enemies);
    addPlatform("blue", 5, 1, -18, 1, 1, 1, enemies);
    addPlatform("blue", 0, 1, -12, 1, 1, 1, enemies);
    addPlatform("blue", 13, 1, -15, 1, 1, 1, enemies);
    addPlatform("blue", 13, 1, -8, 1, 1, 1, enemies);
    addPlatform("blue", -15, 1, -2.375, 1, 1, 1, enemies);
  } else if (level == 5) {
    addPlatform("blue", 0, 2, 30, 3, 3, 3, bosses);
  } else if (level == 6) {
    addPlatform("blue", 7, 2, 27, 1, 1, 1, jumpingEnemies, false, null, {gravity: 0, stage: 0, timeChasing: 0, tx: 0, ty: 0, tz: 0, seen: false, lsx: 0, lsy: 0, lsz: 0, lsgx: 0, lsgy: 0, lsgz: 0});
    addPlatform("blue", 42, 1, 50, 1, 1, 1, jumpingEnemies, false, null, {gravity: 0, stage: 0, timeChasing: 0, tx: 0, ty: 0, tz: 0, seen: false, lsx: 0, lsy: 0, lsz: 0, lsgx: 0, lsgy: 0, lsgz: 0});
  }
  for (let enemy of enemies) {
    enemy.position.y += 0.001;
  }
  for (let enemy of jumpingEnemies) {
    enemy.position.y += 0.001;
  }
  for (let boss of bosses) {
    boss.position.y += 0.001;
  }
}

function setLighting(level) {
  if (level == 4) {
    lighting = true;
  } else {
    lighting = false;
  }
  if (lighting || level == 5) {
    //character.material = new THREE.MeshStandardMaterial({color: "red"});
    renderer.setClearColor("black");
  } else {
    //character.material = new THREE.MeshBasicMaterial({color: "red"});
    renderer.setClearColor("lightblue");
  }
}

const character = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({color: "red"}),
);
character.castShadow = false;
scene.add(character);

function collision(a, b) {
  let aBox = new THREE.Box3(
    new THREE.Vector3(),
    new THREE.Vector3(),
  );
  aBox.setFromObject(a);
  
  let bBox = new THREE.Box3(
    new THREE.Vector3(),
    new THREE.Vector3(),
  );
  bBox.setFromObject(b);
  
  return aBox.intersectsBox(bBox);
}

function collisionAll(a, collisions) {
  return collisions.some(b => collision(a, b));
}

function collisionPoint(a, b) {
  let aPoint = a.position.clone();
  
  let bBox = new THREE.Box3(
    new THREE.Vector3(),
    new THREE.Vector3(),
  );
  bBox.setFromObject(b);
  
  return bBox.containsPoint(aPoint);
}

function collisionAllPoint(a, collisions) {
  return collisions.some(b => collisionPoint(a, b));
}

function collisionRing(a, b) {
  const distance = a.position.distanceTo(new THREE.Vector3(b.position.x, a.position.y, b.position.z));
  const radius = b.geometry.parameters.radius;
  const tube = b.geometry.parameters.tube;
  const height = a.geometry.parameters.height;
  const depth = a.geometry.parameters.depth;
  if (Math.abs(distance - radius) < depth && Math.abs(a.position.y - b.position.y) < tube/2 + height/2) {
    return true;
  }
  return false;
}

function collisionAllRing(a, collisions) {
  return collisions.some(b => collisionRing(a, b));
}

function positionCamera(cameraVector, distance) {
  camera.position.set(x, y, z);
  camera.translateOnAxis(
    cameraVector.normalize(), distance,
  );
  camera.position.y = Math.max(camera.position.y, y+0.25);
}

function movePlatform(platform, tx, ty, tz) {
  character.position.set(x, y-0.05, z);
  const touching = collision(character, platform);
  const toMove = [];
  let otherEnemies = enemies.map(x => x).concat(bosses.map(x => x)).concat(jumpingEnemies.map(x => x));
  for (let enemy of otherEnemies) {
    enemy.position.y -= 0.05;
    if (collision(enemy, platform)) {
      toMove.push(enemy);
    }
    enemy.position.y += 0.05;
  }
  platform.position.x += tx;
  platform.position.y += ty;
  platform.position.z += tz;
  if (touching) {
    x += tx;
    y += ty;
    z += tz;
    character.position.set(x, y, z);
    if (collisionAll(character, collisions)) {
      x -= tx;
      y -= ty;
      z -= tz;
      character.position.set(x, y, z);
    }
  }
  for (let enemy of toMove) {
    enemy.position.x += tx;
    enemy.position.y += ty;
    enemy.position.z += tz;
    if (collisionAll(enemy, collisions)) {
      enemy.position.x -= tx;
      enemy.position.y -= ty;
      enemy.position.z -= tz;
    }
  }
}

function move(tx, ty, tz) {
  for (let i = 0; i < 6; i++) {
    character.position.set(x+(tx/5), y+(ty/5), z+(tz/5));
    if (!collisionAll(character, collisions)) {
      x += tx / 5;
      y += ty / 5;
      z += tz / 5;
    }
  }
}

function enemyLogic(enemy, maxDist=null, speed=null) {
  maxDist = maxDist || !lighting ? 15 : 3;
  speed = speed || 0.055;
  let distance = enemy.position.distanceTo(character.position);
  if (distance < maxDist) {
    const tempx = enemy.position.x;
    const tempy = enemy.position.y;
    const tempz = enemy.position.z;
    while (!collisionAllPoint(enemy, sightCollisions) && !collision(enemy, character)) {
      enemy.lookAt(character.position);
      enemy.translateZ(0.2);
      enemy.rotation.set(0, 0, 0);
    }
    
    if (collision(enemy, character)) {
      if (tutorial == "Go around corners to hide from enemies") tutorial = "";
      enemy.position.set(tempx, tempy, tempz);
      enemy.lookAt(
        character.position.x,
        tempy,
        character.position.z,
      );
      enemy.translateZ(Math.min(speed, distance));
      let tx = enemy.position.x-tempx;
      let tz = enemy.position.z-tempz;
      enemy.position.set(tempx, tempy, tempz);
      enemy.rotation.set(0, 0, 0);
      moveEnemy(enemy, tx, 0);
      moveEnemy(enemy, 0, tz);
    } else {
      enemy.position.set(tempx, tempy, tempz);
    }
  }
}

function moveEnemy(enemy, tx, tz) {
  let otherEnemies = enemies.map(x => x).concat(bosses.map(x => x));
  otherEnemies.splice(otherEnemies.indexOf(enemy), 1);
  let ex = enemy.position.x;
  let ey = enemy.position.y;
  let ez = enemy.position.z;
  for (let i = 0; i < 6; i++) {
    enemy.position.set(ex+(tx/5), ey, ez+(tz/5));
    if (!(collisionAll(enemy, collisions) || collisionAll(enemy, otherEnemies))) {
      enemy.position.y -= 0.05
      if (collisionAll(enemy, collisions)) {
        ex += tx / 5;
        ez += tz / 5;
      }
    }
  }
  enemy.position.set(ex, ey, ez);
}

function smartEnemyLogic(enemy, maxDist=null, speed=null, setpos=null, jumping=false, ls=null, sensitiveEdge=false, moveAgainstWall=false) {
  speed = speed || 0.065;
  const res = canSmartEnemySee(enemy, maxDist);
  const distance = !setpos ? (!ls || res.cansee ? res.distance : enemy.position.distanceTo(ls)) : enemy.position.distanceTo(setpos);
  if (!!setpos || !!ls || res.cansee) {
    const tempx = enemy.position.x;
    const tempy = enemy.position.y;
    const tempz = enemy.position.z;
    enemy.lookAt(
      !!setpos ? setpos.x : ((!!ls && !res.cansee) ? ls.x : character.position.x),
      tempy,
      !!setpos ? setpos.z : ((!!ls && !res.cansee) ? ls.z : character.position.z),
    );
    enemy.translateZ(Math.min(speed, distance));
    const tx = enemy.position.x-tempx;
    const tz = enemy.position.z-tempz;
    enemy.position.set(tempx, tempy, tempz);
    enemy.rotation.set(0, 0, 0);
    const edgex = moveSmartEnemy(enemy, tx, 0, jumping);
    const edgez = moveSmartEnemy(enemy, 0, tz, jumping);
    if (moveAgainstWall && Math.abs(tempx - enemy.position.x) < tx / 2 && tz < speed / 2) {
      moveSmartEnemy(enemy, 0, tz / Math.abs(tz) * speed / 4 * 3, jumping);
    } else if (moveAgainstWall && Math.abs(tempz - enemy.position.z) < tz / 2 && tx < speed / 2) {
      moveSmartEnemy(enemy, tx / Math.abs(tx) * speed /4 * 3, 0, jumping);
    }
    return {edge: sensitiveEdge ? edgex || edgez : (edgex || (edgez && tx < speed / 5)) && (edgez || (edgex && tz < speed / 5)), cansee: res.cansee};
  }
  return {edge: false, cansee: false};
}

function smartEnemyLogic2(enemy, maxDist=null, speed=null) {
  const prevDist = enemy.position.distanceTo(character.position)
  const tempx = enemy.position.x;
  const tempy = enemy.position.y;
  const tempz = enemy.position.z;
  const cansee = smartEnemyLogic(enemy, maxDist, speed, null, false, !enemy.data.seen ? null : {x: enemy.data.lsx, y: enemy.position.y, z: enemy.data.lsz}, false, true).cansee;
  if (cansee) {
    const pchasedistance = enemy.position.distanceTo(character.position) - prevDist;
    const pchasex = enemy.position.x;
    const pchasey = enemy.position.y;
    const pchasez = enemy.position.z;
    
    enemy.position.x = tempx;
    enemy.position.y = tempy;
    enemy.position.z = tempz;

    smartEnemyLogic(enemy, maxDist, speed, {x: enemy.data.lsx, y: enemy.position.y, z: enemy.data.lsz}, false, null, false, true).cansee;
    const lschasedistance = enemy.position.distanceTo(character.position) - prevDist;

    if (/*!enemy.data.seen || pchasedistance < lschasedistance*/true) {
      enemy.position.x = pchasex;
      enemy.position.y = pchasey;
      enemy.position.z = pchasez;
      enemy.data.seen = true;
      enemy.data.lsx = x;
      enemy.data.lsz = z;
    }
  }
}

function jumpingEnemyLogic(enemy) {
  let res;
  let characterTouchingGround;
  if (enemy.data.stage == 0) {
    res = smartEnemyLogic(enemy, null, 0.04, null, false, !enemy.data.seen ? null : {x: enemy.data.lsx, y: enemy.position.y, z: enemy.data.lsz});
    if (res.cansee) {
      enemy.data.timeChasing += 1;
    } else {
      enemy.data.timeChasing = 0;
    }
    checkJump(enemy, res);
  } else if (enemy.data.stage == 1) {
    updateGravity(enemy);

    let characterTouchingGround = false;
    if (character.position.distanceTo({x: enemy.data.tx, y: character.position.y, z: enemy.data.tz}) < 2 &&  enemy.position.y > y) {
      character.position.y -= 0.05;
      characterTouchingGround = collisionAll(character, collisions);
      character.position.y += 0.05;

      if (characterTouchingGround) {
        smartEnemyLogic(enemy, null, 0.085, {x: x, y: enemy.position.y, z: z}, true);
      }
    } 
    
    if (!characterTouchingGround) {
      smartEnemyLogic(enemy, null, 0.085, {x: enemy.data.tx, y: enemy.position.y, z: enemy.data.tz}, true);
    }
    
    enemy.position.y -= 0.05;
    const touchingGround = collisionAll(enemy, collisions);
    const bounce = collisionAll(enemy, trampolines);
    enemy.position.y += 0.05;
    if (touchingGround && !bounce) {
      enemy.data.stage = 2;
      addRing("darkblue", enemy.position.x, enemy.position.y - 0.3, enemy.position.z, 0.05, 0.1, rings);
    } else if (bounce) {
      enemy.data.stage = 3;
      enemy.data.gravity = -4;
    }
  } else if (enemy.data.stage == 2) {
    enemy.data.timeChasing += 1;
    if (enemy.data.timeChasing == 60) {
      addRing("darkblue", enemy.position.x, enemy.position.y - 0.3, enemy.position.z, 0.05, 0.1, rings);
    } else if (enemy.data.timeChasing > 90) {
      enemy.data.timeChasing = 0;
      enemy.data.stage = 0;
    }
  } else if (enemy.data.stage == 3) {
    updateGravity(enemy);
    enemy.position.y -= 0.05;
    const touchingGround = collisionAll(enemy, collisions);
    const bounce = collisionAll(enemy, trampolines);
    enemy.position.y += 0.05;
    if (touchingGround && !bounce) {
      enemy.data.stage = 2;
      addRing("darkblue", enemy.position.x, enemy.position.y - 0.3, enemy.position.z, 0.05, 0.1, rings);
    } else if (bounce) {
      checkJump(enemy, {cansee: canSmartEnemySee(enemy, null).cansee, edge: false}, true);
      if (enemy.data.stage == 3) {
        enemy.data.gravity = -4;
      }
    }
  }
  
  if (enemy.data.stage == 0 && res ? res.cansee : canSmartEnemySee(enemy, enemy.data.stage == 1 ? 20 : 15).cansee) {
    enemy.data.seen = true;
    enemy.data.lsx = x;
    enemy.data.lsy = y;
    enemy.data.lsz = z;
    
    character.position.set(x, y-0.2, z);
    characterTouchingGround = collisionAll(character, collisions);
    character.position.set(x, y, z);
    if (characterTouchingGround && ((enemy.data.stage == 1 ? new THREE.Vector3(enemy.data.tx, enemy.data.ty, enemy.data.tz) : enemy.position)).distanceTo(character.position) < 20) {
      enemy.data.lsgx = x;
      enemy.data.lsgy = y;
      enemy.data.lsgz = z;
    }
  }

  for (let teleporter of teleporters) {
    if (collision(teleporter, enemy)) {
      enemy.position.x = teleporter.data.tpx;
      enemy.position.y = teleporter.data.tpy;
      enemy.position.z = teleporter.data.tpz;
      enemy.data.stage = 3;
      enemy.data.gravity = 0;
      enemy.data.timeChasing = 0;
    }
  }
}

function checkJump(enemy, res, always=false) {
  if (res.edge || enemy.data.timeChasing > 120 || Math.abs(res.cansee ? y : enemy.data.lsgy) - enemy.position.y > 0.25 || always) {
    if (res.cansee) {
      character.position.set(x, y-0.05, z);
      const characterTouchingGround = collisionAll(character, collisions);
      character.position.set(x, y, z);
      if (characterTouchingGround) {
        setJumpingEnemyTarget(enemy, x, y, z)
      }
    } else if (enemy.data.seen) {
      let jump = true;
      if (!(enemy.data.timeChasing > 120 || Math.abs(res.cansee ? y : enemy.data.lsgy) - enemy.position.y > 0.25 || always)) {
        const tempx = enemy.position.x;
        const tempy = enemy.position.y;
        const tempz = enemy.position.z;
        jump = smartEnemyLogic(enemy, null, null, {x: enemy.data.lsgx, y: enemy.data.lsgy, z: enemy.data.lsgz}, false, null, true).edge;
        enemy.position.x = tempx;
        enemy.position.y = tempy;
        enemy.position.z = tempz;
      }
      
      if (jump) {
        const distEnemyLsg = enemy.position.distanceTo(new THREE.Vector3(enemy.data.lsgx, enemy.position.y, enemy.data.lsgz));
        if (distEnemyLsg > 2 && distEnemyLsg < 21) {
          setJumpingEnemyTarget(enemy, enemy.data.lsgx, enemy.data.lsgy, enemy.data.lsgz)
        }
      }
    }
  }
}

function updateGravity(enemy) {
  const tempy = enemy.position.y;
  enemy.position.y -= enemy.data.gravity * 0.1;
  enemy.data.gravity += 0.05;
  if (collisionAll(enemy, collisions)) {
    let count = 0;
    while (collisionAll(enemy, collisions) && count < 10) {
      if (enemy.data.gravity > 0) {
        enemy.position.y += 0.0025;
      } else {
        enemy.position.y -= 0.0025;
      }
      count += 1;
    }
    if (count == 10) enemy.position.y = tempy;
    enemy.data.gravity = 0;
  }
}

function setJumpingEnemyTarget(enemy, x, y, z) {
  enemy.data.stage = 1;
  enemy.data.timeChasing = 0;
  enemy.data.gravity = -4;
  enemy.data.tx = x;
  enemy.data.ty = y;
  enemy.data.tz = z;
}

function canSmartEnemySee(enemy, maxDist=null) {
  maxDist = maxDist || (!lighting ? 15 : 3);
  const distance = enemy.position.distanceTo(character.position);
  if (distance < maxDist) {
    const tempx = enemy.position.x;
    const tempy = enemy.position.y;
    const tempz = enemy.position.z;
    while (!collisionAllPoint(enemy, sightCollisions) && !collision(enemy, character)) {
      enemy.lookAt(character.position);
      enemy.translateZ(0.2);
      enemy.rotation.set(0, 0, 0);
    }
    const res = {cansee: collision(enemy, character), distance: distance};
    enemy.position.set(tempx, tempy, tempz);
    enemy.rotation.set(0, 0, 0);
    return res;
  }
  return {cansee: false, distance: distance};
}

function moveSmartEnemy(enemy, tx, tz, jumping=false) {
  let otherEnemies = enemies.map(x => x).concat(bosses.map(x => x)).concat(jumpingEnemies.map(x => x));
  otherEnemies.splice(otherEnemies.indexOf(enemy), 1);
  let ex = enemy.position.x;
  let ey = enemy.position.y;
  let ez = enemy.position.z;
  for (let i = 0; i < 6; i++) {
    enemy.position.set(ex+(tx/5), ey, ez+(tz/5));
    if (!(collisionAll(enemy, collisions) || collisionAll(enemy, otherEnemies))) {
      enemy.position.y -= 0.05
      if (jumping || collisionAll(enemy, collisions)) {
        ex += tx / 5;
        ez += tz / 5;
      } else {
        enemy.position.set(ex, ey, ez);
        return true;
      }
    }
  }
  enemy.position.set(ex, ey, ez);
  return false;
}

function moveOnAxis(tx, tz) {
  character.lookAt(
    controls.object.position.x,
    y,
    controls.object.position.z,
  );
  character.translateX(-tx);
  character.translateZ(-tz);
  character.rotation.x = 0;
  character.rotation.y = 0;
  character.rotation.z = 0;
  tx = character.position.x - x;
  tz = character.position.z - z;
  character.position.set(x, y, z);
  move(tx, 0, 0);
  move(0, 0, tz);
  xVel += tx / 6;
  zVel += tz / 6;
  xVel = Math.min(xVel, 0.15*(1/Math.sqrt(2)));
  zVel = Math.min(zVel, 0.15*(1/Math.sqrt(2)));
}

function respawn() {
  startOfAttempt = Date.now();
  attempts += 1;
  const tmpTutorial = tutorial;
  setup(level);
  tutorial = tmpTutorial;
  y = 4;
  character.position.set(x, y, z);
  if (tutorial == "Go back to the start to finish") tutorial = "Collect all the keys to complete the level";
  if (level == 4) tutorial = "Escape the dungeon without being caught";
  if (level == 3) tutorial = "";
  if (level == 5) tutorial = "Defeat the boss to complete the level";
}

function nextLevel() {
  levelStarted = false;
  location = "win";
  win = true;
  start = (Date.now() - start) / 1000;
  startOfAttempt = (Date.now() - startOfAttempt) / 1000;
  document.getElementById("leaderboard").className = "post";
  localStorage.setItem("level", level === MAX_LEVEL ? 1 : level + 1);
  localStorage.setItem("levelUnlocked", Math.min(Math.max(level + 1, localStorage.getItem("levelUnlocked")), MAX_LEVEL));
  controls.unlock();
}

function skipLevel(inSelection) {
  const currentLvl = inSelection ? levelSelected : level;
  level = currentLvl === MAX_LEVEL ? 1 : currentLvl + 1;
  localStorage.setItem("level", level);
  localStorage.setItem("levelUnlocked", Math.min(Math.max(currentLvl + 1, localStorage.getItem("levelUnlocked")), MAX_LEVEL));
  setup(level);
  if (locked) {
    controls.unlock();
  } else {
    levelSelected = level;
  }
}

function frame() {
  if (locked) {
    if (keysPressed.has("Space")) {
      character.position.set(x, y-0.05, z);
      if (collisionAll(character, platforms)
          || collisionAll(character, movingX)
          || collisionAll(character, movingY)
          || collisionAll(character, movingZ)
          || collisionAll(character, unstables)
          || collisionAll(character, falling)
          || collisionAll(character, ices)
         ) {
        gravity = -1.5;
      }
      if (tutorial == "Press Space to jump") tutorial = "Collect all the keys to complete the level";
    }
    
    const placeholder = y;
    let bounce = false;
    gravity += 0.05;
    y -= gravity * 0.1;
    character.position.set(x, y, z);
    if (collisionAll(character, collisions)) {
      if (collisionAll(character, trampolines)) bounce = true;
      let count = 0;
      while (collisionAll(character, collisions) && count < 10) {
        if (gravity > 0) {
          y += 0.0025;
        } else {
          y -= 0.0025;
        }
        count += 1;
        character.position.set(x, y, z);
      }
      if (count == 10) y = placeholder;
      character.position.set(x, y, z);
      if (bounce) {
        gravity = -4;
      } else {
        gravity = 0;
      }
    }

    tick += 1;
    for (let moveX of movingX) {
      movePlatform(moveX, (tick % 500) < 250 ? -0.05 : 0.05, 0, 0);
    }
    for (let moveY of movingY) {
      movePlatform(moveY, 0, (tick % 250) < 125 ? 0.05 : -0.05, 0);
    }
    for (let moveZ of movingZ) {
      movePlatform(moveZ, 0, 0, (tick % 500) < 250 ? 0.05 : -0.05);
    }

    for (let teleporter of teleporters) {
      if (collision(character, teleporter)) {
        x = teleporter.data.tpx;
        y = teleporter.data.tpy;
        z = teleporter.data.tpz;
        character.position.set(x, y, z);
        gravity = 0;
      }
    }
    
    const toConvert = [];
    for (let unstable of unstables) {
      character.position.set(x, y-0.05, z);
      if (collision(character, unstable)) {
        toConvert.push(unstable);
      }
    }
    character.position.set(x, y, z);
    for (let unstable of toConvert) {
      unstables.splice(unstables.indexOf(unstable), 1);
      falling.push(unstable);
      if (tutorial == "Escape the dungeon without being caught") tutorial = "Unstable platforms collapse when stood on";
    }
    
    for (let fall of falling) {
      movePlatform(fall, 0, -0.025, 0);
    }
    for (let slowFall of slowFalling) {
      movePlatform(slowFall, 0, -0.005, 0);
    }
  
    let xMov = 0;
    let zMov = 0;
    if (keysPressed.has("ArrowUp") || keysPressed.has("KeyW")) {
      zMov += 0.1;
    }
    if (keysPressed.has("ArrowDown") || keysPressed.has("KeyS")) {
      zMov -= 0.1;
    }
    if (keysPressed.has("ArrowLeft") || keysPressed.has("KeyA")) {
      xMov += 0.1;
    }
    if (keysPressed.has("ArrowRight") || keysPressed.has("KeyD")) {
      xMov -= 0.1;
    }
    if (Math.abs(xMov) == 0.1 && Math.abs(zMov) == 0.1) {
      xMov *= 1/Math.sqrt(2);
      zMov *= 1/Math.sqrt(2);
    }

    xVel *= 0.96;
    zVel *= 0.96;
    character.position.set(x, y-0.05, z);
    if (collisionAll(character, ices)) {
      move(xVel/1.5, 0, zVel/1.5);
      xMov *= 0.3;
      zMov *= 0.3;
    } else {
      xVel *= 0.953;
      zVel *= 0.953;
    }
    character.position.set(x, y, z);

    moveOnAxis(xMov, zMov);
    if (!(xMov == 0 && zMov == 0)) {
      if (tutorial == "Press the Arrow Keys/WASD to move") tutorial = "Press Space to jump";
    }
    //xVel *= 0.875;
    //zVel *= 0.875;
  
    for (let key of keys) {
      if (collision(character, key)) {
        removeObject(key);
        keys.splice(keys.indexOf(key), 1);
        if (bossFightStarted) {
          if (bossWave == 1) {
            addPlatform("blue", -5, 1.001, 30, 1, 1, 1, enemies);
          } else if (bossWave == 2) {
            addPlatform("blue", 5, 1.001, 30, 1, 1, 1, enemies);
          } else if (bossWave == 3) {
            addPlatform("blue", 0, 1.001, 25, 1, 1, 1, enemies);
          }
        }
        bossFightStarted = false;
        keysCount += 1;
        if (keysCount == keysGoal && level !== 5) {
          addPlatform("darkorange", 0, 1, 0, 0.4, 0.4, 0.4, keys, false, false);
          if (tutorial == "Collect all the keys to complete the level" || tutorial == "Unstable platforms collapse when stood on" || level == 3) tutorial = "Go back to the start to finish";
        } else if (keysCount === keysGoal+1 && level !== 5) {
          nextLevel();
        } else if (level === 5 && bossWave === 4) {
          let platform = platforms[4];
          platforms.splice(4, 1);
          slowFalling.push(platform);
          tutorial = "Thanks for playing!";
        }
      }
    }
    
    if (keysPressed.has("AltLeft") && keysPressed.has("KeyF") && keysPressed.has("Digit4")) skipLevel(false);

    for (let enemy of enemies) {
      enemyLogic(enemy); // Cube parkour 2 uses smartEnemyLogic2
    }

    for (let enemy of jumpingEnemies) {
      jumpingEnemyLogic(enemy)
    }
    
    if (collisionAll(character, triggers) && !bossFightStarted) {
      for (let fall of falling) removeObject(fall);
      falling.splice(0, falling.length);
      
      if (bossTick == 0) {
        addPlatform("darkorange", 0, 1, 0, 0.4, 0.4, 0.4, keys);
      }
      bossFightStarted = true;
      bossTick = 0;
      bossWave += 1;
    }
    if (bossFightStarted) {
      bossTick += 1;
      for (let boss of bosses) {
        if (bossTick > 50) {
          if ((bossTick - 49) < 500) {
            enemyLogic(boss, Infinity, 0.04);
          } else if ((bossTick - 49) < 700) {
            character.position.set(0, 2, 30);
            if (character.position.distanceTo(boss.position) > 0.1) {
              enemyLogic(boss, Infinity, 0.05);
            } else {
              boss.position.set(0, 2.001, 30);
            }
            character.position.set(x, y, z);
          } else if ((bossTick - 49) < 1900) {
            if ((bossTick - 749) % (bossWave < 3 ? 60 : 50) === (bossWave < 3 ? 55 : 45)) {
              addRing("darkblue", 0, 0.5, 30, 0.1, 0.2, rings);
            }
            if ((bossTick - 749) % (bossWave < 3 ? 60 : 50) < (bossWave < 3 ? 30 : 25)) {
              boss.position.y += bossWave < 3 ? 0.1 : 0.085;
            } else {
              boss.position.y -= bossWave < 3 ? 0.1 : 0.085;
            }
          } else if ((bossTick - 49) == 1900) {
            boss.position.set(0, 2.001, 30);
            if (bossWave == 1) {
              addPlatform(0x361704, 15, 0, 30, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, 20, 0, 30, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, 25, 0, 30, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, 30, 2, 35, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, 30, 4, 39, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, 22, 4, 39, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, 14, 4, 39, 1.5, 1, 1.5, unstables);
            } else if (bossWave == 2) {
              addPlatform(0x361704, -15, 0, 30, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, -20, 0, 30, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, -25, 0, 30, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, -30, 2, 25, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, -35, 3.1, 20, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, -40, 4.2, 25, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, -35, 5.3, 30, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, -30, 6.4, 25, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, -35, 7.5, 20, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, -40, 8.6, 25, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, -35, 9.7, 30, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, -27.5, 9.7, 30, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, -20, 9.7, 30, 1.5, 1, 1.5, unstables);
            } else if (bossWave == 3) {
              addPlatform(0x361704, 0, 0, 45, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, 0, 1.5, 50, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, 0, 3, 55, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, -2, 2, 50, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, 2, 4, 48.5, 1.5, 1, 1.5, unstables);
            } else if (bossWave == 4) {
              addPlatform(0x361704, 0, 0, 5, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, 0, 0, 10, 1.5, 1, 1.5, unstables);
              addPlatform(0x361704, 0, 0, 15, 1.5, 1, 1.5, unstables);
            }
            updateCollisions();
          }
        }
      }
    }

    if (tutorial === "Thanks for playing!" && slowFalling[0].position.y < -5) nextLevel()

    for (let ring of rings) {
      const radius = ring.geometry.parameters.radius;
      const tube = ring.geometry.parameters.tube;
      ring.geometry.dispose();
      ring.geometry = new THREE.TorusGeometry(radius + 0.1, radius < 18.5 ? tube : tube - 0.005, 16, 100);
      //ring.geometry = new THREE.TorusGeometry(radius + 0.1, tube, 16, 50);
      if (radius > 20) {
        removeObject(ring);
        rings.splice(rings.indexOf(ring), 1);
      }
    }
  
    if (y < -50 || collisionAll(character, enemies.concat(bosses.concat(jumpingEnemies))) || collisionAll(character, lava) || collisionAllRing(character, rings)) respawn();
  
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    if (keysGoal != 0) {
      ctx.textAlign = "left";
      ctx.fillText("Keys: "+keysCount+"/"+(keysGoal+(level == 5 ? 1 : 0)), 30, 50);
    }
    ctx.textAlign = "right";
    ctx.fillText("Level "+level, width-30, 50);
    ctx.textAlign = "center";
    ctx.fillText(tutorial, width/2, height-50);
    
    doRender = true;
  } else if (!win && !levelSelect && !leaderboard) {
    ctx.clearRect(0, 0, width, height);
    
    ctx.textAlign = "center";
    ctx.font = `70px "${FONT_NAME}"`;
    for (let i = 0.5; i < 5; i += 0.1) {
      ctx.beginPath();
      ctx.fillStyle = "#cc0000";
      ctx.rect(width/2+i-180, height/2+i-70, 15, 15);
      ctx.fill();
      
      ctx.beginPath();
      ctx.fillStyle = "#000794";
      ctx.rect(width/2+i+25, height/2+i-60, 15, 15);
      ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Cube Parkour", width/2, height/2);
    
    ctx.beginPath();
    ctx.fillStyle = "red";
    ctx.rect(width/2-180, height/2-70, 15, 15);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "blue";
    ctx.rect(width/2+25, height/2-60, 15, 15);
    ctx.fill();
    
    ctx.fillStyle = "#ffffff";
    ctx.font = `35px "${FONT_NAME}"`;

    if (!iframe) {
      ctx.fillText("Click anywhere to play", width/2, height-50);
      ctx.font = `35px "${FONT_NAME}"`;
      ctx.textAlign = "left";
      ctx.fillText("Level Select", 30, 50);
      ctx.textAlign = "right";
      ctx.fillText("Leaderboard", width-30, 50);
      ctx.fillText("Music", width-30, height-70);
      ctx.fillText("Settings", width-30, height-30);
      ctx.font = `35px "${FONT_NAME}"`;
      ctx.textAlign = "center";
    } else {
      ctx.fillText("Click anywhere to play", width/2, height-50);
    }
  } else if (win) {
    ctx.clearRect(0, 0, width, height);
    if (!posting) {
      ctx.textAlign = "center";
      
      ctx.fillStyle = "#ffffff";
      ctx.font = `45px "${FONT_NAME}"`;
      ctx.fillText("Level "+level, width/2, height/2-55);
      
      ctx.fillStyle = "darkgreen";
      ctx.font = `50px "${FONT_NAME}"`;
      ctx.fillText("Completed", width/2, height/2);
      
      ctx.fillStyle = "#ffffff";
      ctx.font = `25px "${FONT_NAME}"`;
      ctx.fillText("Attempts: "+attempts, width/2, height/2+50);
      ctx.fillText("Time: "+startOfAttempt, width/2, height/2+75);
      ctx.fillText("Total Time: "+start, width/2, height/2+98);
  
      ctx.font = `35px "${FONT_NAME}"`;
      ctx.fillText("Click anywhere to continue", width/2, height-50);
    } else {
      ctx.font = `70px "${FONT_NAME}"`;
      ctx.fillText("Loading...", width/2, height/2);
    }
  } else if (levelSelect) {
    ctx.clearRect(0, 0, width, height);
    
    ctx.textAlign = "center";
    ctx.font = `70px "${FONT_NAME}"`;
    ctx.fillText("Level "+levelSelected, width/2, height/2);
    ctx.fillStyle = levelSelected + 1 > Math.min(localStorage.getItem("levelUnlocked") || 1, MAX_LEVEL) ? "gray" : "white";
    ctx.fillText("+", (width/2)+150, height/2);
    ctx.fillStyle = levelSelected - 1 < 1 ? "gray" : "white";
    ctx.fillText("-", (width/2)-150, height/2);
    ctx.fillStyle = "white";

    ctx.font = `35px "${FONT_NAME}"`;
    ctx.fillText("Leaderboard", width/2, height/2 + 50);
    if (levelSelected == (localStorage.getItem("levelUnlocked") || 1) && levelSelected < MAX_LEVEL) {
      ctx.font = `33px "${FONT_NAME}"`;
      ctx.fillText("Skip this level", width/2, height/2 + 85);
    }
    ctx.font = `35px "${FONT_NAME}"`;
    ctx.fillText("Click anywhere to exit", width/2, height-50);
  } else {
    ctx.clearRect(0, 0, width, height);
    let place;
    if (leaderboardItems !== null) {
      for (let i in leaderboardItems) {
        ctx.fillText(leaderboardItems[i].username, width/2, 120 + i*30 + scrollPos);
        place = parseInt(i)+1;
        ctx.fillText("#"+place, width/2-250, 120 + i*30 + scrollPos);
        ctx.fillText(leaderboardItems[i].time, width/2+250, 120 + i*30 + scrollPos);
      }
      ctx.clearRect(0, 0, width, 75);
      ctx.clearRect(0, height-100, width, height);
    } else {
      ctx.font = `70px "${FONT_NAME}"`;
      ctx.fillText("Loading...", width/2, height/2);
    }
    ctx.font = `35px "${FONT_NAME}"`;
    ctx.fillText("Level "+levelSelected, width/2, 50);
    ctx.fillText("-", width/2-250, 50);
    ctx.fillText("+", width/2+250, 50);
    ctx.fillText("Click anywhere to exit", width/2, height-50);
  }

  if (doRender) render();
  //window.requestAnimationFrame(frame);
}

function render() {
  doRender = false;
  
  if (lighting) {
    for (let light of playerLights) {
      scene.remove(light);
    }
    playerLights.splice(0, playerLights.length);
    addLight("white", x, y, z, 70, 2, 0, playerLights);
  }

  let distance = 0;
  let cameraVector = new THREE.Vector3();
  camera.position.set(x, y, z);
  
  while (distance < 5.01 && !collisionAllPoint(camera, collisions)) {
    distance += 0.2;
    cameraVector.z = distance;
    positionCamera(cameraVector, distance);
  }
  
  if (distance > 5.01) {
    distance = 5.01;
  } else {
    while (collisionAllPoint(camera, collisions)) {
      distance -= 0.01;
      cameraVector.z = distance;
      positionCamera(cameraVector, distance);
    }
  }
  distance -= 0.31;
  cameraVector.z = distance;
  positionCamera(cameraVector, distance);
  
  if (Math.abs((camera.rotation.x/Math.PI)+0.2) < 0.02) camera.position.z -= 0.001;
  
  renderer.render(scene, camera);
}

async function postScore() {
  posting = true;
  location = "posting";
  document.getElementById("leaderboard").className = "post hidden";
  const data = await fetch(`${SERVER_URL}/add`, {
    method: "POST",
    body: JSON.stringify({
      level: level,
      time: startOfAttempt,
    }),
  }).then(res => res.text());
  window.location.href = data;
}

async function getLeaderboard(level, username=null) {
  leaderboardItems = null;
  const data = await fetch(`${SERVER_URL}/get`, {
    method: "POST",
    body: JSON.stringify({
      level: level,
    }),
  }).then(res => res.json());
  leaderboardItems = data;
  if (username !== null) {
    scrollPos = (leaderboardItems.indexOf(leaderboardItems.find(item => item.username === username)) * -30) - 15;
    scrollPos = Math.min(0, Math.max(height-200-(leaderboardItems.length * 30), scrollPos));
  } else {
    scrollPos = 0;
  }
}

async function startAudio() {
  if (theme.canplay) {
    theme.play().then(_ => {
      playing = true;

      setInterval(() => {
        if (theme.currentTime > END_POS) {
          theme.pause();
          setTimeout(() => {
            theme.currentTime = REPEAT_POS;
            theme.play();
          }, 15);
        }
      }, 2);
    }).catch(_ => {})
  }
}

async function audioLoad() {
  theme = new Audio(AUDIO_URL);
  document.onclick = startAudio;
  startAudio();
}

document.getElementById("leaderboard").onclick = postScore;

canvas.onclick = canvasText.onclick = async event => {
  if (!iframe && !locked) {
    if (!win && !levelSelect && !leaderboard) {
      if (event.clientY > 70 || (event.clientX > 240 && event.clientX < width-240)) {
        if (!levelStarted) {
          attempts = 1;
          start = Date.now();
          startOfAttempt = Date.now();
        }
        levelStarted = true;
        controls.lock();
      } else {
        if (event.clientX - (width/2) < 0) {
          levelSelect = true;
          location = "select";
          levelSelected = level;
        } else {
          leaderboard = true;
          location = "leaderboard";
          levelSelected = 1;
          getLeaderboard(levelSelected);
          scrollPos = 0;
        }
      }
    } else if (win && !posting) {
      level = level === MAX_LEVEL ? 1 : level + 1;
      setup(level);
      win = false;
      location = "locked";
      document.getElementById("leaderboard").className = "post hidden";
    } else if (levelSelect) {
      if (Math.abs(event.clientY - ((height/2)-25)) < 30 && Math.abs(event.clientX - (width/2)) < 250) {
        if (event.clientX - (width/2) > 0) {
          levelSelected += 1;
          if (levelSelected > Math.min(localStorage.getItem("levelUnlocked") || 1, MAX_LEVEL)) {
            levelSelected -= 1;
          }
        } else {
          levelSelected -= 1;
          if (levelSelected < 1) {
            levelSelected += 1;
          }
        }
      } else if (Math.abs(event.clientY - ((height/2)+30)) < 20 && Math.abs(event.clientX - (width/2)) < 100) {
        levelSelect = false;
        leaderboard = true;
        location = "leaderboard";
        getLeaderboard(levelSelected);
        scrollPos = 0;
      } else if (Math.abs(event.clientY - ((height/2)+65)) < 20 && Math.abs(event.clientX - (width/2)) < 100 && levelSelected == (localStorage.getItem("levelUnlocked") || 1) && levelSelected < MAX_LEVEL) {
        skipLevel(true);
      } else {
        levelSelect = false;
        location = "locked";
        if (level !== levelSelected) {
          level = levelSelected;
          setup(level);
          localStorage.setItem("level", level);
          levelStarted = false;
        }
      }
    } else {
      if (event.clientY < 100 && Math.abs(event.clientX - (width/2)) < 300) {
        if (event.clientX - (width/2) > 0) {
          levelSelected += 1;
          if (levelSelected > MAX_LEVEL) {
            levelSelected -= 1;
          } else {
            getLeaderboard(levelSelected);
            scrollPos = 0;
          }
        } else {
          levelSelected -= 1;
          if (levelSelected < 1) {
            levelSelected += 1;
          } else {
            getLeaderboard(levelSelected);
            scrollPos = 0;
          }
        }
      } else {
        leaderboard = false;
        location = "locked";
      }
    }
  } else if (iframe) {
    if (IFRAME_REDIRECT !== null) window.open(IFRAME_REDIRECT);
  }
}

controls.addEventListener("lock", () => {
  locked = true;
  location = "playing";
  keysPressed = new Set();
  document.getElementById("licence").className = "licence hidden";
});

controls.addEventListener("unlock", () => {
  locked = false;
  location = "locked";
  document.getElementById("licence").className = "licence";
});

window.addEventListener("keydown", event => keysPressed.add(event.code));
window.addEventListener("keyup", event => keysPressed.delete(event.code));

window.addEventListener("mousemove", event => {
  if (locked && tutorial == "Move the mouse to look around") tutorial = "Press the Arrow Keys/WASD to move";
});

window.addEventListener("wheel", event => {
  scrollPos += event.wheelDelta/3;
  scrollPos = Math.min(0, Math.max(height-200-(leaderboardItems.length * 30), scrollPos));
});

window.addEventListener("resize", () => {
  width = window.innerWidth;
  height = window.innerHeight;
  
  camera.aspect = width / height;
	camera.updateProjectionMatrix();
	renderer.setSize(width, height);
  doRender = true;
  
  canvasText.width = width;
  canvasText.height = height;
  ctx = canvasText.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.font = `35px "${FONT_NAME}"`;
  ctx.textAlign = "center";
  scrollPos = Math.min(0, Math.max(height-200-(leaderboardItems.length * 30), scrollPos));
});

let x = 0;
let y = 1;
let z = 0;
let xVel = 0;
let zVel = 0;
let gravity = 0;

let keysCount = 0;
let keysGoal = 0;

let doRender = false;

let tick = 0;
let bossTick = 0;
let bossFightStarted = false;
let bossWave = 0;

let leaderboardItems = [];
let keysPressed = new Set();

let tutorial = "";

let location = "locked";
let locked = false;
let win = false;
let posting = false;
let leaderboard = false;
let levelSelect = false;
if (DEBUG) setInterval(() => console.log(location), 10)

let levelSelected = 1;
let scrollPos = 0;

let start = 0;
let startOfAttempt = 0;
let attempts = 1;
let levelStarted = false;
let lighting = false;
let iframe = window.self !== window.top && IFRAME_REDIRECT !== null;
let level = Math.min(localStorage.getItem("level") || 1, MAX_LEVEL);
const enableEnemies = true;

let playing = false;
let theme;

const command = window.location.hash ? window.location.hash.substring(1) : "";
try {
  const commands = command.split(",");
  if (commands[0] == "leaderboard" && commands[1] && commands[2] && parseInt(commands[2])) {
    leaderboard = true;
    location = "leaderboard";
    levelSelected = parseInt(commands[2]);
    getLeaderboard(levelSelected, commands[1]);
  }
} catch (e) {}

if (window.location.href.slice(-1) === "#" || window.location.hash.length > 0) {
  window.location.replace("#");
  if (typeof window.history.replaceState == "function") {
    history.replaceState({}, "", window.location.href.slice(0, -1));
  }
}

let elapsed, now;
let then = window.performance.now();
function frameLoop() {
  requestAnimationFrame(frameLoop);

  if (FPS_CAP) {
    now = window.performance.now();
    elapsed = now - then;
  
    if (elapsed > FPS_INTERVAL) {
      frame();
      then = now - (elapsed % FPS_INTERVAL);
    }
  } else {
    frame()
  }
}

let font = new FontFace(
  FONT_NAME,
  `url(${FONT_FILE})`
);
document.fonts.add(font);
font.load();

audioLoad();

setup(level);

document.fonts.load(`35px ${FONT_NAME}`).then((fonts) => {
  document.getElementById("loading").className = "hidden";
  //frame();
  frameLoop();
});