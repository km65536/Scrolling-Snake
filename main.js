const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// プレイヤーを構成するパーツ（セグメント）の総数
const segmentCount = 30;
// 各パーツの座標を保持する配列
const segments = [];

// 速度、加速度、ゲーム状態の変数
let velocityX = 0;
let acceleration = 0.75; // 1フレームあたりの速度変化量

// 状態管理: 'start' (開始待ち), 'playing' (プレイ中), 'gameover' (ゲームオーバー)
let gameState = 'start';

// --- 新追加：壁とスコアの変数 ---
let walls = [];
let score = 0;
const wallHeight = 20; // 壁の厚さ
const gapWidth = 150;  // 通り抜けられる穴の幅
const wallSpeed = 4;   // 壁が迫ってくる速度

// 画面サイズに合わせてキャンバスをリサイズし、パーツの位置を設定する関数
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // 画面の「真ん中下より」の範囲に縦方向のy座標を等間隔で配置
    const startY = canvas.height * 0.5; // 開始位置（頭のy座標：画面中央）
    const endY = canvas.height * 0.9;   // 終了位置（尻尾のy座標：画面下部90%）
    const spacing = (endY - startY) / (segmentCount - 1);
    
    if (segments.length === 0) {
        // 初回起動時：x座標を画面中央にして、縦一直線にパーツを配置
        const centerX = canvas.width / 2;
        for (let i = 0; i < segmentCount; i++) {
            segments.push({
                x: centerX,
                y: startY + i * spacing
            });
        }
    } else {
        // プレイ中の画面回転（リサイズ）時：x座標は維持し、固定y座標のみ再計算
        for (let i = 0; i < segmentCount; i++) {
            segments[i].y = startY + i * spacing;
        }
    }
}

// 画面サイズ変更時のイベントを登録
window.addEventListener('resize', resizeCanvas);
// 初回のキャンバスサイズ・パーツ位置を設定
resizeCanvas();

// --- 新追加：壁を生成する関数 ---
function spawnWall() {
    // 穴のX座標をランダムに決定（画面外にはみ出ないように計算）
    const gapX = Math.random() * (canvas.width - gapWidth);
    walls.push({
        y: -wallHeight, // 画面の上端から出現させる
        gapX: gapX,
        passed: false   // まだ通過していないフラグ
    });
}

// ゲームを初期状態にリセットして開始する関数
function resetGame() {
    velocityX = 0;
    acceleration = 0.75;
    gameState = 'playing';
    
    // 壁とスコアの初期化
    walls = [];
    score = 0;
    
    const startY = canvas.height * 0.5;
    const endY = canvas.height * 0.9;
    const spacing = (endY - startY) / (segmentCount - 1);
    const centerX = canvas.width / 2;
    
    for (let i = 0; i < segmentCount; i++) {
        segments[i].x = centerX;
        segments[i].y = startY + i * spacing;
    }
}

// --- タッチイベントの処理 ---

// タッチ開始時
canvas.addEventListener('touchstart', (e) => {
    // ブラウザのデフォルト挙動（スクロールなど）を防止
    e.preventDefault();
    
    // 開始待ち画面の場合はプレイ状態に移行
    if (gameState === 'start') {
        gameState = 'playing';
        return;
    }
    
    // ゲームオーバー時は、タップでゲームをリセットして再開する
    if (gameState === 'gameover') {
        resetGame();
        return;
    }
    
    // プレイ中は加速度の向きを反転（正なら負に、負なら正になる）
    acceleration *= -1;
}, { passive: false });

// タッチが離れた時（スクロール防止などのために残しておく）
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
}, { passive: false });

// --- ゲームループの処理 ---

// データ状態の更新
function update() {
    // プレイ中以外は更新処理を行わない
    if (gameState !== 'playing') return;
    
    // 2. 2番目以降のパーツは、それぞれ「1つ前のパーツのX座標」を追いかける
    for (let i = segmentCount-1; i > 0; i--) {
        segments[i].x = segments[i - 1].x;
    }
    
    // 1. 速度に加速度を加算し、最先端のパーツ（頭）のX座標を更新する
    velocityX += acceleration;
    segments[0].x += velocityX;
    
    // 頭のX座標とY座標（当たり判定用）
    const headX = segments[0].x;
    const headY = segments[0].y;
    
    // --- 新追加：壁の更新と当たり判定処理 ---
    
    // 壁が1つもない、または最後の壁が一定距離（画面高さの40%）まで進んだら新しい壁を生成
    if (walls.length === 0 || walls[walls.length - 1].y > canvas.height * 0.4) {
        spawnWall();
    }
    
    // 後ろからループを回して壁を移動（配列から削除する処理があるため後ろから回す）
    for (let i = walls.length - 1; i >= 0; i--) {
        let wall = walls[i];
        wall.y += wallSpeed;
        
        // 当たり判定：プレイヤーの頭が壁のY座標の範囲内にあるか
        if (headY >= wall.y && headY <= wall.y + wallHeight) {
            // X座標が穴の範囲外（壁の部分）ならゲームオーバー
            if (headX < wall.gapX || headX > wall.gapX + gapWidth) {
                gameState = 'gameover';
            }
        }
        
        // スコア加算：プレイヤーの頭が壁を無事に通り過ぎたら（1回のみ）
        if (!wall.passed && headY < wall.y) {
            wall.passed = true;
            score++;
        }
        
        // 画面外に出た壁を配列から削除してメモリを節約
        if (wall.y > canvas.height) {
            walls.splice(i, 1);
        }
    }
    
    // --- 既存の壁判定（左右の画面外に出たらゲームオーバー） ---
    if (segments[0].x < 0 || segments[0].x > canvas.width) {
        gameState = 'gameover';
        // 画面外に完全に消えないよう、壁際で座標を固定する
        if (segments[0].x < 0) segments[0].x = 0;
        if (segments[0].x > canvas.width) segments[0].x = canvas.width;
    }
}

// 画面への描画
function draw() {
    // 前のフレームをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景を暗い色で塗りつぶし
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // --- 新追加：壁の描画 ---
    ctx.fillStyle = '#ff00aa'; // 壁の色（鮮やかなピンク）
    for (let i = 0; i < walls.length; i++) {
        let wall = walls[i];
        // 左側の壁
        ctx.fillRect(0, wall.y, wall.gapX, wallHeight);
        // 右側の壁
        ctx.fillRect(wall.gapX + gapWidth, wall.y, canvas.width - (wall.gapX + gapWidth), wallHeight);
    }
    
    // ウニョウニョ動く線の描画設定
    ctx.beginPath();
    // ゲームオーバー時は線の色を赤色に変更、それ以外はネオン風の鮮やかな水色
    ctx.strokeStyle = (gameState === 'gameover') ? '#ff0033' : '#00ffcc';
    ctx.lineWidth = 2;          // 線の太さ
    ctx.lineCap = 'round';       // 線の端を丸くする
    ctx.lineJoin = 'round';      // 線の結合部を丸くする
    
    // 線の始点を頭の座標に設定
    ctx.moveTo(segments[0].x, segments[0].y);
    
    // 二次ベジェ曲線（quadraticCurveTo）を使い、各パーツの間を滑らかな曲線で繋ぐ
    for (let i = 0; i < segmentCount - 1; i++) {
        // 現在のパーツと次のパーツの中点を計算し、そこを通過点とする
        const midX = (segments[i].x + segments[i + 1].x) / 2;
        const midY = (segments[i].y + segments[i + 1].y) / 2;
        
        // パーツの座標を制御点、中点を通る曲線を描画
        ctx.quadraticCurveTo(segments[i].x, segments[i].y, midX, midY);
    }
    
    // 最後のパーツに向けて直線を結んでストロークを完了させる
    ctx.lineTo(segments[segmentCount - 1].x, segments[segmentCount - 1].y);
    ctx.stroke();

    // --- 新追加：スコアの描画 ---
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Score: ' + score, 20, 20);

    // テキスト描画（状態に応じたメッセージ）
    if (gameState === 'start') {
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Tap to Start', canvas.width / 2, canvas.height / 2);
    } else if (gameState === 'gameover') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.font = '20px sans-serif';
        ctx.fillText('Tap to Restart', canvas.width / 2, canvas.height / 2 + 10);
    }
}

// メインゲームループの駆動
function gameLoop() {
    update();
    draw();
    // 次のフレームの描画をブラウザに要求
    requestAnimationFrame(gameLoop);
}

// ゲームループの開始
requestAnimationFrame(gameLoop);
