\
    #!/usr/bin/env bash
    set -euo pipefail

    # Load parameters if present
    if [ -f "./ops/rebrand.env" ]; then
      source ./ops/rebrand.env
    fi

    : "${OLD_NAME_LOWER:=ventalocal}"
    : "${OLD_NAME_CAMEL:=VentaLocal}"
    : "${OLD_NAME_SPACED:=Comercio Ya}"
    : "${NEW_NAME_LOWER:=ventalocal}"
    : "${NEW_NAME_CAMEL:=VentaLocal}"
    : "${NEW_SCOPE:=@ventalocal}"
    : "${NEW_DB:=ventalocal}"
    : "${NEW_NET:=ventalocal-network}"
    : "${NEW_HOST_DEV:=api.dev.ventalocal.com.ar}"

    echo "== Rebrand $OLD_NAME_LOWER → $NEW_NAME_LOWER / $OLD_NAME_CAMEL → $NEW_NAME_CAMEL"

    # Tools check
    for bin in rg perl jq; do
      command -v "$bin" >/dev/null 2>&1 || { echo "Missing $bin. Please install ripgrep/perl/jq."; exit 1; }
    done
    # Optional yq for YAML edits
    if ! command -v yq >/dev/null 2>&1; then
      echo "yq not found, OpenAPI server/title won't be auto-updated."
    fi

    mkdir -p .backup-rebrand
    # Backup selected files
    (ls docker-compose*.yml 2>/dev/null && cp docker-compose*.yml .backup-rebrand/) || true
    (rg -l --glob '**/package.json' '"name"\s*:\s*"' | xargs -r -d '\n' -I{} cp {} .backup-rebrand/ 2>/dev/null) || true
    [ -d docs ] && cp -a docs .backup-rebrand/docs || true

    # Rename directories containing old name
    while IFS= read -r -d '' d; do
      newd="${d//$OLD_NAME_LOWER/$NEW_NAME_LOWER}"
      if [[ "$d" != "$newd" ]]; then
        git mv "$d" "$newd" 2>/dev/null || mv "$d" "$newd"
      fi
    done < <(find . -type d -name "*$OLD_NAME_LOWER*" -print0)

    # Text replacements excluding heavy/binary folders
    mapfile -t files1 < <(rg -l --hidden --glob '!.git' --glob '!node_modules' --glob '!dist' --glob '!build' --glob '!*.png' --glob '!*.jpg' --glob '!*.jpeg' --glob '!*.webp' --glob '!*.mp4' "$OLD_NAME_LOWER" || true)
    if (( ${#files1[@]} )); then
      printf '%s\0' "${files1[@]}" | xargs -0 perl -pi -e "s/$OLD_NAME_LOWER/$NEW_NAME_LOWER/g"
    fi

    mapfile -t files2 < <(rg -l --hidden --glob '!.git' --glob '!node_modules' --glob '!dist' --glob '!build' "$OLD_NAME_CAMEL" || true)
    if (( ${#files2[@]} )); then
      printf '%s\0' "${files2[@]}" | xargs -0 perl -pi -e "s/$OLD_NAME_CAMEL/$NEW_NAME_CAMEL/g"
    fi

    # NPM scope
    rg -l '@ventalocal/' | xargs -r perl -pi -e 's/\@ventalocal\//\@ventalocal\//g'
    # ENV prefix
    perl -pi -e 's/COMERCIOYA_/VENTALOCAL_/g' $(rg -l 'COMERCIOYA_' || true)
    # Network / container names
    perl -pi -e 's/ventalocal-network/'"$NEW_NET"'/g' $(rg -l 'ventalocal-network' || true)
    perl -pi -e 's/ventalocal-([a-zA-Z0-9_\-]+)/ventalocal-$1/g' $(rg -l 'ventalocal-' || true)
    # DB names in compose
    for F in $(ls docker-compose*.yml 2>/dev/null); do
      perl -pi -e 's/POSTGRES_DB:\s*ventalocal/POSTGRES_DB: '"$NEW_DB"'/g' "$F"
    done

    # OpenAPI updates
    if [ -f docs/openapi.yml ] && command -v yq >/dev/null 2>&1; then
      yq -i '.info.title="VentaLocal API"' docs/openapi.yml || true
      yq -i '.servers=[{"url":"https://'"$NEW_HOST_DEV"'"}]' docs/openapi.yml || true
    fi

    # Seeds / SQL / scripts
    rg -l 'ventalocal' | grep -E 'seed|migr|sql|py|ts|js' | xargs -r perl -pi -e 's/ventalocal/ventalocal/g'

    echo "== Scan for leftovers =="
    rg -n "$OLD_NAME_LOWER" || echo "OK: no occurrences of $OLD_NAME_LOWER"
    rg -n "$OLD_NAME_CAMEL" || echo "OK: no occurrences of $OLD_NAME_CAMEL"

    echo "Done. Review git diff and commit."
