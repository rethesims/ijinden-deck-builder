// SPDX-License-Identifier: MIT

// カード画像は自前ホストのサムネイル (public/images/<id>-<hash>.jpg, 幅250px) を使う。
// 公式サイトの PNG は1枚あたり数百KB あり Cache-Control も付かないため、一覧表示に
// 使うと通信量が跳ね上がる。原寸の公式画像は拡大表示のときだけ読み込む。
function ImageCard({
  imageUrl, alt, numCopies, loading = 'auto', small = false, children,
}) {
  const width = small ? 40 : 80;
  const height = small ? 56 : 112;
  const containerClass = small
    ? 'container-card card-small'
    : 'container-card card-medium';
  return (
    <div className={containerClass}>
      <img
        className="img-card"
        width={width}
        height={height}
        src={imageUrl}
        alt={alt}
        loading={loading}
        decoding="async"
      />
      {
        numCopies !== undefined
          && <span className="container-num-copies">{numCopies}</span>
      }
      {children}
    </div>
  );
}

export default ImageCard;
