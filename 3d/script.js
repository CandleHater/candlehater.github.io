function getFlameMaterial(isFrontSide){
    let side = isFrontSide ? THREE.FrontSide : THREE.BackSide;

    return new THREE.ShaderMaterial({
        uniforms: {
            time: {
                value: 0
            }
        },
        vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying float hValue;

        //https://thebookofshaders.com/11/
        // 2D Random
        float random (in vec2 st) {
            return fract(sin(dot(st.xy,
            vec2(12.9898,78.233)))
            * 43758.5453123);
        }

        // 2D Noise based on Morgan McGuire @morgan3d
        // https://www.shadertoy.com/view/4dS3Wd
        float noise (in vec2 st) {
            vec2 i = floor(st);
            vec2 f = fract(st);

            // Four corners in 2D of a tile
            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));

            // Smooth Interpolation

            // Cubic Hermine Curve.  Same as SmoothStep()
            vec2 u = f*f*(3.0-2.0*f);
            // u = smoothstep(0.,1.,f);

            // Mix 4 coorners percentages
            return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
        }

        void main() {
            vUv = uv;
            vec3 pos = position;

            pos *= vec3(0.8, 2, 0.725);
            hValue = position.y;
            //float sinT = sin(time * 2.) * 0.5 + 0.5;
            float posXZlen = length(position.xz);

            pos.y *= 1. + (cos((posXZlen + 0.25) * 3.1415926) * 0.25 + noise(vec2(0, time)) * 0.125 + noise(vec2(position.x + time, position.z + time)) * 0.5) * position.y; // flame height

            pos.x += noise(vec2(time * 2., (position.y - time) * 4.0)) * hValue * 0.0312; // flame trembling
            pos.z += noise(vec2((position.y - time) * 4.0, time * 2.)) * hValue * 0.0312; // flame trembling

            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
        }
        `,

        fragmentShader: `
        varying float hValue;
        varying vec2 vUv;

        // honestly stolen from https://www.shadertoy.com/view/4dsSzr
        vec3 heatmapGradient(float t) {
            return clamp((pow(t, 1.5) * 0.8 + 0.2) * vec3(smoothstep(0.0, 0.35, t) + t * 0.5, smoothstep(0.5, 1.0, t), max(1.0 - t * 1.7, t * 7.0 - 6.0)), 0.0, 1.0);
        }

        void main() {
            float v = abs(smoothstep(0.0, 0.4, hValue) - 1.);
            float alpha = (1. - v) * 0.99; // bottom transparency
            alpha -= 1. - smoothstep(1.0, 0.97, hValue); // tip transparency
            gl_FragColor = vec4(heatmapGradient(smoothstep(0.0, 0.3, hValue)) * vec3(0.95,0.95,0.4), alpha) ;
            gl_FragColor.rgb = mix(vec3(0,0,1), gl_FragColor.rgb, smoothstep(0.0, 0.3, hValue)); // blueish for bottom
            gl_FragColor.rgb += vec3(1, 0.9, 0.5) * (1.25 - vUv.y); // make the midst brighter
            gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.66, 0.32, 0.03), smoothstep(0.95, 1., hValue)); // tip
        }
        `,
        transparent: true,
        side: side
    });
}

/* TODO
- make taller
- add B
- redraw on resize
- make flame better
    - https://www.shadertoy.com/view/XsXSWS
    - https://www.shadertoy.com/results?query=candle
- add floating wax
- make wick move a little

from https://codepen.io/prisoner849/full/XPVGLp
*/

var heightMultiplier = 1;

// -----------------------------------------------------------

var scene = new THREE.Scene();

var camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(3, 5, 8).setLength(15);

var renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x101005);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

var controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.minPolarAngle = THREE.Math.degToRad(60);
controls.maxPolarAngle = THREE.Math.degToRad(95);
controls.minDistance = 4;
controls.maxDistance = 20;
controls.autoRotate = true;
controls.autoRotateSpeed = 1;
controls.target.set(0, 2, 0);
controls.update();

// scene.add(new THREE.GridHelper(10, 10, 0x552222, 0x333322));

var light = new THREE.DirectionalLight(0xffffff, .03);
light.position.setScalar(10);

scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, .08));

// candle
var casePath = new THREE.Path();
casePath.moveTo(0, 0);
casePath.lineTo(0, 0);
casePath.absarc(1.5, .5, .5, Math.PI * 1.5, Math.PI * 2);
casePath.lineTo(2, heightMultiplier * 1.5);
casePath.lineTo(1.99, heightMultiplier * 1.5);
casePath.lineTo(1.9, .5);

var caseGeo = new THREE.LatheBufferGeometry(casePath.getPoints(), 64);
var caseMat = new THREE.MeshStandardMaterial({
    color: 'silver'
});
var caseMesh = new THREE.Mesh(caseGeo, caseMat);
caseMesh.castShadow = true;

// paraffin
var paraffinPath = new THREE.Path();
paraffinPath.moveTo(0, -.25);
paraffinPath.lineTo(0, -.25);
paraffinPath.absarc(1, 0, .25, Math.PI * 1.5, Math.PI * 2);
paraffinPath.lineTo(1.25, 0);
paraffinPath.absarc(1.89, .1, .1, Math.PI * 1.5, Math.PI * 2);

var paraffinGeo = new THREE.LatheBufferGeometry(paraffinPath.getPoints(), 64);
paraffinGeo.translate(0, heightMultiplier * 1.25, 0);

var paraffinMat = new THREE.MeshStandardMaterial({
    color: 0xffff99,
    side: THREE.BackSide,
    metalness: 0,
    roughness: .75
});
var paraffinMesh = new THREE.Mesh(paraffinGeo, paraffinMat);
caseMesh.add(paraffinMesh);

// wick
var wickProfile = new THREE.Shape();
wickProfile.absarc(0, 0, .0625, 0, Math.PI * 2);

var wickCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, .5, -.0625),
    new THREE.Vector3(.25, .5, .125)
    ]);

var wickGeo = new THREE.ExtrudeBufferGeometry(wickProfile, {
    steps: 8,
    bevelEnabled: false,
    extrudePath: wickCurve
});

var colors = [];
var color1 = new THREE.Color(0x000000);
var color2 = new THREE.Color(0x994411);
var color3 = new THREE.Color(0xffff44);

for (let i = 0; i < wickGeo.attributes.position.count; i++){
    if (wickGeo.attributes.position.getY(i) < .4){
        color1.toArray(colors, i * 3);

    } else {
        color2.toArray(colors, i * 3);
    };

    if (wickGeo.attributes.position.getY(i) < .15) {
        color3.toArray(colors, i * 3);
    }
}

wickGeo.addAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3 ));
wickGeo.translate(0, heightMultiplier * .95, 0);
var wickMat = new THREE.MeshBasicMaterial({vertexColors: THREE.VertexColors});

var wickMesh = new THREE.Mesh(wickGeo, wickMat);
caseMesh.add(wickMesh);

// candle light
var candleLight = new THREE.PointLight(0xffaa33, 1, 5, 2);
candleLight.position.set(0, 3, 0);
candleLight.castShadow = true;
caseMesh.add(candleLight);

var candleLight2 = new THREE.PointLight(0xffaa33, 1, 10, 2);
candleLight2.position.set(0, 4, 0);
candleLight2.castShadow = true;
caseMesh.add(candleLight2);
// scene.add(new THREE.PointLightHelper(candleLight2)); // DEV

// flame
var flameMaterials = [];
function flame(isFrontSide) {
    let flameGeo = new THREE.SphereBufferGeometry(.5, 32, 32);
    flameGeo.translate(0, .5, 0);

    let flameMat = getFlameMaterial(true);
    flameMaterials.push(flameMat);

    let flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(.06, heightMultiplier * 1.2, .06);
    flame.rotation.y = THREE.Math.degToRad(-45);

    caseMesh.add(flame);
}

flame(false);
flame(true);

// table
var tableGeo = new THREE.CylinderBufferGeometry(14, 14, .5, 64);
tableGeo.translate(0, -.25, 0);
var tableMat = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load("https://threejs.org/examples/textures/hardwood2_diffuse.jpg"),
    metalness: 0,
    roughness: .75
});
var tableMesh = new THREE.Mesh(tableGeo, tableMat);
tableMesh.receiveShadow = true;

tableMesh.add(caseMesh);
scene.add(tableMesh);

// pentagram
// var penta = new THREE.CircleGeometry(7, 5);
// penta.rotateX(-Math.PI * 0.5);
// penta.vertices.shift();
// var pentagramGeo = new THREE.BufferGeometry().setFromPoints(penta.vertices);
// pentagramGeo.setIndex([0,1, 1,2, 2,3, 3,4, 4,0, 0,2, 2,4, 4,1, 1,3, 3,0]);
// var pentagram = new THREE.LineSegments(pentagramGeo, new THREE.LineBasicMaterial({
//     color: 0xff3311
// }));
// pentagram.y = 0.01;
// scene.add(pentagram);

var clock = new THREE.Clock();
var time = 0;

render();
function render(){
    requestAnimationFrame(render);

    time += clock.getDelta();
    flameMaterials[0].uniforms.time.value = time;
    flameMaterials[1].uniforms.time.value = time;

    candleLight2.position.x = Math.sin(time * Math.PI) * .25;
    candleLight2.position.z = Math.cos(time * Math.PI * .75) * .25;
    candleLight2.intensity = 2 + Math.sin(time * Math.PI * 2) * Math.cos(time * Math.PI * 1.5) * .25;

    controls.update();
    renderer.render(scene, camera);
}
