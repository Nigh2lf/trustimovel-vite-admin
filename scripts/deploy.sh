#!/usr/bin/env bash
# Roda na EC2 pelo Systems Manager: baixa o bundle gerado na Action e o coloca na pasta do nginx.
# Espera DIST_URL (URL pré-assinada do .tar.gz no S3) e DIST_DIR (pasta que o nginx serve).
set -euo pipefail

: "${DIST_URL:?Informe DIST_URL}"
: "${DIST_DIR:?Informe DIST_DIR}"

work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

curl -fsS -o "$work/dist.tar.gz" "$DIST_URL"
mkdir "$work/dist"
tar -xzf "$work/dist.tar.gz" -C "$work/dist"
test -f "$work/dist/index.html"

# Arquivos novos entram antes e os antigos saem só no fim, sem janela com asset faltando.
rsync -a --delete-after "$work/dist/" "$DIST_DIR/"

echo "Publicado em $DIST_DIR: $(grep -o 'assets/index-[^"]*\.js' "$DIST_DIR/index.html" | head -1)"
