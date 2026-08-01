// SPDX-License-Identifier: MIT

// カード画像は自前ホストのサムネイル (public/images/<id>-<hash>.jpg, 幅250px) を使う。
// 公式サイトの PNG は1枚あたり数百KB あり Cache-Control も付かないため、一覧表示に
// 使うと通信量が跳ね上がる。原寸の公式画像は拡大表示のときだけ読み込む。
//
// isActive はタッチ端末向け。hover がない端末では、タップしたカードだけ
// 操作ボタン (またはガーディアンの表面) を出すために使う。
// 全部を出しっぱなしにするとカードが隠れて選択中のように見えてしまう。
function ImageCard({
  imageUrl, alt, numCopies, loading = 'auto', small = false,
  isActive = false, handleClickImage = undefined, children,
}) {
  const isInteractive = handleClickImage !== undefined;
  const width = small ? 40 : 80;
  const height = small ? 56 : 112;
  const containerClass = [
    'container-card',
    small ? 'card-small' : 'card-medium',
    isActive ? 'is-active' : '',
  ].filter(Boolean).join(' ');

  const image = (
    <img
      className="img-card"
      width={width}
      height={height}
      src={imageUrl}
      alt={alt}
      loading={loading}
      decoding="async"
    />
  );

  return (
    <div className={containerClass}>
      {
        // タップで操作ボタンを出す必要があるときだけボタンにする。
        // div に role を付けるのではなく button にしておけば、
        // キーボード操作も読み上げも既定の挙動に任せられる。
        isInteractive
          ? (
            <button
              type="button"
              className="btn-card-toggle"
              onClick={handleClickImage}
              aria-label={`${alt} の操作`}
              aria-pressed={isActive}
            >
              {image}
            </button>
          )
          : image
      }
      {
        numCopies !== undefined
          && <span className="container-num-copies">{numCopies}</span>
      }
      {children}
    </div>
  );
}

export default ImageCard;
