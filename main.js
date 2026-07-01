const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// プレイヤーを構成するパーツ（セグメント）の総数
const segmentCount = 30;
// 各パーツの座標を保持する配列
const segments = [];

// 速度、加速度、ゲームオーバー状態の変数
let velocityX = 0;
let acceleration = 0.75; // 1フレームあたりの速度変化量
let isGameOver = true;

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

// ゲームを初期状態にリセットする関数
function resetGame() {
    velocityX = 0;
    acceleration = 0.75;
    isGameOver = false;
    
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
    
    // ゲームオーバー時は、タップでゲームをリセットして再開する
    if (isGameOver) {
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
    // ゲームオーバー時は更新処理を停止
    if (isGameOver) return;

    // 1. 速度に加速度を加算し、最先端のパーツ（頭）のX座標を更新する
    velocityX += acceleration;
    segments[0].x += velocityX;
    
    // 壁判定（画面外に出たらゲームオーバー）
    if (segments[0].x < 0 || segments[0].x > canvas.width) {
        isGameOver = true;
        // 画面外に完全に消えないよう、壁際で座標を固定する
        if (segments[0].x < 0) segments[0].x = 0;
        if (segments[0].x > canvas.width) segments[0].x = canvas.width;
    }
    
    // 2. 2番目以降のパーツは、それぞれ「1つ前のパーツのX座標」を追いかける
    // これにより、y座標が固定されたまま、x座標の変化が後ろへ伝播し「ウニョウニョ」とした波が生まれる
    for (let i = 1; i < segmentCount; i++) {
        // followSpeedは胴体の連動スピード。遅延を大きくしたい場合はこの数値を下げる
        const followSpeed = 0.9;
        segments[i].x += (segments[i - 1].x - segments[i].x) * followSpeed;
    }
}

// 画面への描画
function draw() {
    // 前のフレームをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景を暗い色で塗りつぶし
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // ウニョウニョ動く線の描画設定
    ctx.beginPath();
    // ゲームオーバー時は線の色を赤色に変更、プレイ中はネオン風の鮮やかな水色
    ctx.strokeStyle = isGameOver ? '#ff0033' : '#00ffcc';
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
    

    // ゲームオーバー時のテキスト描画
    if (isGameOver) {
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
