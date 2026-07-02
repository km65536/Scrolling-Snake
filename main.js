const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// プレイヤーを構成するパーツ（セグメント）の総数
const segmentCount = 30;

// X座標とY座標を完全に別の配列として管理する
const segmentsX = [];
const segmentsY = [];

// --- 変更点：蛇の速度と壁の速度を1つの変数に統合 ---
let gameSpeed = 5; // 蛇の進むスピード（間隔）と壁の流れるスピードを統括

// 速度、加速度、ゲーム状態の変数
let startX = 0;
let velocityX = 0;
let accelerationX = 0.75; // 1フレームあたりの速度変化量

// 状態管理: 'start' (開始待ち), 'playing' (プレイ中), 'gameover' (ゲームオーバー)
let gameState = 'start';

// --- 壁とスコアの変数 ---
let walls = [];
let score = 0;
const wallHeight = 2; // 壁の厚さ
let gapWidth = 0;  // 通り抜けられる穴の幅

// 現在の画面サイズに基づいて、必要な座標や間隔を計算して返す
function calculateLayout() {
    const startY = canvas.height * 0.5; // 開始位置（頭のy座標：画面中央）
    const centerX = canvas.width / 2;
    
    // 蛇の縦の間隔（spacing）を、ゲーム全体のスピード（gameSpeed）と同期させる
    const spacing = gameSpeed; 
    
    return { startY, spacing, centerX };
}

// 画面サイズに合わせてキャンバスをリサイズし、パーツの位置を設定する関数
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // 穴の幅を画面の横幅の1/6と、60pxの大きいほうに設定
    gapWidth = Math.max(canvas.width / 6, 60);
    
    // 共通関数から計算結果を受け取る
    const layout = calculateLayout();
    
    // Y座標はリサイズ時にしか変わらないため、ここで計算して配列を埋め尽くす
    segmentsY.length = 0;
    for (let i = 0; i < segmentCount; i++) {
        segmentsY.push(layout.startY + i * layout.spacing);
    }
    
    if (segmentsX.length === 0) {
        // 初回起動時：x座標を画面中央にして配置
        startX = layout.centerX;
        for (let i = 0; i < segmentCount; i++) {
            segmentsX.push(layout.centerX);
        }
    }
}

// 画面サイズ変更時のイベントを登録
window.addEventListener('resize', resizeCanvas);
// 初回のキャンバスサイズ・パーツ位置を設定
resizeCanvas();

// --- 壁を生成する関数 ---
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
    accelerationX = 0.75;
    gameState = 'playing';
    
    // 壁とスコアの初期化
    walls = [];
    score = 0;
    
    // 共通関数から現在の画面サイズに合った計算結果を受け取る
    const layout = calculateLayout();

    startX = layout.centerX;
    
    // Y座標はリサイズ時に計算されているため、X座標の配列だけをリセットすればOK
    segmentsX.length = 0;
    for (let i = 0; i < segmentCount; i++) {
        segmentsX.push(layout.centerX);
    }
}

// --- 入力処理（タップとEnterキーで共通） ---
function handleInput(e) {
    // デフォルト挙動（スクロールなど）を防止（イベントが存在し、キャンセル可能な場合のみ）
    if (e && e.cancelable) {
        e.preventDefault();
    }
    
    // 開始待ち画面の場合はプレイ状態に移行
    if (gameState === 'start') {
        gameState = 'playing';
        return;
    }
    
    // ゲームオーバー時はゲームをリセットして再開する
    if (gameState === 'gameover') {
        resetGame();
        return;
    }
    
    // プレイ中は加速度の向きを反転（正なら負に、負なら正になる）
    accelerationX *= -1;
}

// タッチ開始時（スマホ用）
canvas.addEventListener('touchstart', (e) => {
    handleInput(e);
}, { passive: false });

// キーボード押下時（PC用）
window.addEventListener('keydown', (e) => {
    // Enterキーが押された場合のみ処理する
    if (e.key === 'Enter') {
        // キーの長押しによる連続反応を防止する
        if (e.repeat) return;
        handleInput(e);
    }
});

// タッチが離れた時（スクロール防止などのために残しておく）
canvas.addEventListener('touchend', (e) => {
    if (e && e.cancelable) {
        e.preventDefault();
    }
}, { passive: false });

// --- ゲームループの処理 ---

// データ状態の更新
function update() {
    // プレイ中以外は更新処理を行わない
    if (gameState !== 'playing') return;
    
    // 1. 速度に加速度を加算し、最先端のパーツ（頭）のX座標を更新する
    velocityX += accelerationX;
    startX += velocityX;
    
    // 最新のX座標を配列の先頭に追加し、はみ出した末尾を削除するだけで、全体が1つ後ろへズレる
    segmentsX.unshift(startX);
    segmentsX.pop();
    
    // 頭のX座標とY座標（当たり判定用）
    const headX = segmentsX[0];
    const headY = segmentsY[0];
    
    // --- 壁の更新と当たり判定処理 ---
    
    // 一つ前の壁がいなくなったあたり（画面下部から50px手前）で次の壁をスポーンさせる
    if (walls.length === 0 || walls[walls.length - 1].y > canvas.height - 50) {
        spawnWall();
    }
    
    // 後ろからループを回して壁を移動（配列から削除する処理があるため後ろから回す）
    for (let i = walls.length - 1; i >= 0; i--) {
        let wall = walls[i];
        
        // 1フレーム前の壁のY座標を記録しておく（すり抜け防止用）
        const previousWallY = wall.y;
        
        // 変更点：統一したゲームスピードを使って壁を迫らせる
        wall.y += gameSpeed;
        
        const currentWallBottom = wall.y + wallHeight;
        
        // すり抜けバグを防止するためのSweep（軌跡）当たり判定
        // 1フレーム前から現在のフレームまでの間に、プレイヤーの頭のY座標が含まれているかを確認
        if (headY >= previousWallY && headY <= currentWallBottom) {
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
    if (segmentsX[0] < 0 || segmentsX[0] > canvas.width) {
        gameState = 'gameover';
        // 画面外に完全に消えないよう、壁際で座標を固定する
        if (segmentsX[0] < 0) segmentsX[0] = 0;
        if (segmentsX[0] > canvas.width) segmentsX[0] = canvas.width;
    }
}

// 画面への描画
function draw() {
    // 前のフレームをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景を暗い色で塗りつぶし
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // --- スコアの描画（画面中央やや上部に数字のみを表示） ---
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(score, canvas.width / 2, canvas.height * 0.25);

    // --- 壁の描画 ---
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
    ctx.moveTo(segmentsX[0], segmentsY[0]);
    
    // 二次ベジェ曲線（quadraticCurveTo）を使い、各パーツの間を滑らかな曲線で繋ぐ
    for (let i = 0; i < segmentCount - 1; i++) {
        // 現在のパーツと次のパーツの中点を計算し、そこを通過点とする
        const midX = (segmentsX[i] + segmentsX[i + 1]) / 2;
        const midY = (segmentsY[i] + segmentsY[i + 1]) / 2;
        
        // パーツの座標を制御点、中点を通る曲線を描画
        ctx.quadraticCurveTo(segmentsX[i], segmentsY[i], midX, midY);
    }
    
    // 最後のパーツに向けて直線を結んでストロークを完了させる
    ctx.lineTo(segmentsX[segmentCount - 1], segmentsY[segmentCount - 1]);
    ctx.stroke();

    // テキスト描画（状態に応じたメッセージ）
    if (gameState === 'start') {
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Tap or Enter to Start', canvas.width / 2, canvas.height / 2);
    } else if (gameState === 'gameover') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
        
        ctx.font = '20px sans-serif';
        ctx.fillText('Tap or Enter to Restart', canvas.width / 2, canvas.height / 2 + 10);
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
