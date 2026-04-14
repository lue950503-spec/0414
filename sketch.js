let nodes = [];
let seaweeds = [];

// 音效物件
let osc, env;

function setup() {
  // 建立畫布並放置在 index.html 指定的容器中
  let canvasDiv = document.getElementById('canvas-container');
  let canvas = createCanvas(canvasDiv.offsetWidth, canvasDiv.offsetHeight);
  canvas.parent('canvas-container');
  
  // 初始化「水滴 / 氣泡」音效合成器 (不需依賴外部 mp3 檔案)
  env = new p5.Envelope();
  env.setADSR(0.01, 0.1, 0, 0); // 極短的攻擊與衰減，營造「啵」的感覺
  env.setRange(0.5, 0);
  
  osc = new p5.Oscillator('sine');
  osc.amp(env);
  osc.start();

  // 產生背景的動態海草
  for (let i = 0; i < 6; i++) {
    seaweeds.push(new Seaweed(random(width), height, random(60, 120)));
  }

  // 產生各週作品的節點 (從畫面底部長出來，所以 Y 座標越來越小)
  let spacing = height / 6;
  nodes.push(new SeedNode(1, "0310(1)", "https://lue950503-spec.github.io/0310-1-/", height - spacing * 1));
  nodes.push(new SeedNode(2, "0310(2)", "https://lue950503-spec.github.io/0310-2-/", height - spacing * 2));
  nodes.push(new SeedNode(3, "0317", "https://lue950503-spec.github.io/0317/", height - spacing * 3));
  nodes.push(new SeedNode(4, "0324", "https://lue950503-spec.github.io/0324/", height - spacing * 4));
  nodes.push(new SeedNode(5, "0407", "https://lue950503-spec.github.io/20260407/", height - spacing * 5));
  // 老師與學生可以在此繼續 Push week3, week4 等等...
}

function draw() {
  // 水底漸層感背景
  background(10, 30, 60);

  // 1. 繪製背景海草
  for (let sw of seaweeds) {
    sw.display();
  }

  // 2. 利用 Vertex & For 繪製「時間軸主藤蔓」
  stroke(80, 200, 150, 200);
  strokeWeight(6);
  noFill();
  beginShape();
  for (let y = height; y > 0; y -= 20) {
    // 讓主藤蔓產生隨時間扭動的效果
    let x = width / 2 + sin(y * 0.01 + frameCount * 0.02) * 60;
    vertex(x, y);
  }
  endShape();

  // 3. 繪製互動的「時光種子」節點
  for (let node of nodes) {
    node.updatePosition(); // 讓種子跟著藤蔓一起波動
    node.display();
  }
}

function mousePressed() {
  // 啟動音效引擎 (瀏覽器安全限制：必須透過使用者點擊才能發出聲音)
  userStartAudio();

  for (let node of nodes) {
    if (node.isHovered(mouseX, mouseY)) {
      node.click();
    }
  }
}

// 當視窗縮放時，重新調整畫布大小
function windowResized() {
  let canvasDiv = document.getElementById('canvas-container');
  resizeCanvas(canvasDiv.offsetWidth, canvasDiv.offsetHeight);
}

// ==========================================
// 類別 1：時光種子 (展示節點)
// ==========================================
class SeedNode {
  constructor(week, title, url, baseY) {
    this.week = week;
    this.title = title;
    this.url = url;
    this.baseY = baseY; // 固定的高度
    this.x = 0;
    this.y = baseY;
    this.r = 25; // 基礎半徑
  }

  updatePosition() {
    // 必須與主藤蔓的 sin 波浪公式一致，讓花朵精準黏在藤蔓上
    this.x = width / 2 + sin(this.y * 0.01 + frameCount * 0.02) * 60;
  }

  isHovered(mx, my) {
    // 判斷滑鼠是否懸停在節點上
    return dist(mx, my, this.x, this.y) < this.r;
  }

  display() {
    let hovered = this.isHovered(mouseX, mouseY);
    
    // 滑鼠懸停時放大並產生呼吸跳動感
    let currentR = this.r;
    if (hovered) {
      currentR = this.r * 1.4 + sin(frameCount * 0.2) * 3;
      cursor(HAND);
    }

    push();
    translate(this.x, this.y);
    
    // 懸停時花朵會旋轉
    if (hovered) {
      rotate(frameCount * 0.05);
    } else {
      rotate(sin(frameCount * 0.05) * 0.2); // 沒懸停時微幅搖曳
    }

    // 利用 Vertex 畫出花朵形狀的種子
    fill(hovered ? color(255, 180, 200) : color(150, 255, 200));
    stroke(255, 255, 255, 200);
    strokeWeight(3);
    beginShape();
    let petals = 6; // 花瓣數量
    for (let a = 0; a < TWO_PI; a += 0.1) {
      // 根據角度結合 sin 產生花瓣凹凸
      let r = currentR + sin(a * petals) * (currentR * 0.3);
      vertex(cos(a) * r, sin(a) * r);
    }
    endShape(CLOSE);

    // 中心文字 (W1, W2)
    fill(hovered ? 50 : 20);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(14);
    textStyle(BOLD);
    // 為了不被剛剛的 rotate 影響，先把旋轉轉回來再寫字
    rotate(hovered ? -frameCount * 0.05 : -sin(frameCount * 0.05) * 0.2);
    text("W" + this.week, 0, 0);
    pop();

    // 顯示作品標題提示 (Tooltip)
    if (hovered) {
      push();
      fill(255);
      noStroke();
      textAlign(LEFT, CENTER);
      textSize(18);
      // 加上簡單的文字陰影增加辨識度
      drawingContext.shadowBlur = 10;
      drawingContext.shadowColor = 'black';
      text(this.title, this.x + 40, this.y);
      pop();
    }
  }

  click() {
    // 1. 播放「水滴 / 氣泡」音效
    osc.freq(random(600, 900)); // 起始高頻
    osc.freq(150, 0.15); // 在 0.15 秒內快速下滑至低頻，模擬水滴落水聲
    env.play();

    // 2. 更新 Iframe 內容
    let iframe = document.getElementById('portfolio-frame');
    if (iframe) {
      iframe.src = this.url;
    }
  }
}

// ==========================================
// 類別 2：背景海草
// ==========================================
class Seaweed {
  constructor(x, y, segments) {
    this.x = x;
    this.y = y;
    this.segments = segments; // 海草節點數
    this.offset = random(1000); // Noise 的隨機偏移量，讓每株動態不同
  }

  display() {
    push();
    noFill();
    stroke(30, 100, 80, 150);
    strokeWeight(12);
    // 讓海草末端變尖
    drawingContext.lineCap = 'round';
    drawingContext.lineJoin = 'round';
    
    beginShape();
    for (let i = 0; i < this.segments; i++) {
      let ny = this.y - i * 8;
      // 利用 noise 製造自然的搖曳感，越往上擺幅越大
      let nx = this.x + (noise(i * 0.05, frameCount * 0.01 + this.offset) - 0.5) * (i * 1.5);
      
      // 越往上畫筆越細
      strokeWeight(map(i, 0, this.segments, 12, 1));
      vertex(nx, ny);
    }
    endShape();
    pop();
  }
}
