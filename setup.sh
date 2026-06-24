#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

fail() {
  printf "${RED}%s${NC}\n" "$1" >&2
  exit 1
}

load_nvm() {
  if command -v nvm >/dev/null 2>&1; then
    return
  fi

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$NVM_DIR/nvm.sh" ]]; then
    # shellcheck disable=SC1090
    . "$NVM_DIR/nvm.sh"
    return
  fi

  fail "nvm is required but was not found. Install nvm and rerun setup.sh."
}

read_trimmed_file() {
  local path="$1"

  [[ -f "$path" ]] || fail "Required manifest '$path' was not found."
  sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' "$path"
}

get_tool_version() {
  local tool_name="$1"
  local version

  version="$(awk -v tool="$tool_name" '
    $1 == tool && NF >= 2 { print $2; exit }
  ' .tool-versions)"

  [[ -n "$version" ]] || fail "Tool '$tool_name' was not found in .tool-versions."
  printf '%s\n' "$version"
}

get_python_version_from_pyproject() {
  local version

  version="$(sed -nE 's/^[[:space:]]*requires-python[[:space:]]*=[[:space:]]*"==([^"]+)"[[:space:]]*$/\1/p' pyproject.toml | head -n 1)"
  [[ -n "$version" ]] || fail "Could not parse requires-python from pyproject.toml. Expected exact pin like ==3.13.0."
  printf '%s\n' "$version"
}

assert_version_match() {
  local label="$1"
  local expected="$2"
  local actual="$3"

  [[ "$expected" == "$actual" ]] || fail "$label mismatch. Expected: $expected, Found: $actual"
}

printf "Validating toolchain manifests...\n"

EXPECTED_NODE_FROM_NVMRC="$(tr -d '[:space:]' < .nvmrc)"
EXPECTED_NODE_FROM_NVMRC="${EXPECTED_NODE_FROM_NVMRC#v}"
EXPECTED_NODE_FROM_TOOL_VERSIONS="$(get_tool_version nodejs)"
EXPECTED_PYTHON_FROM_TOOL_VERSIONS="$(get_tool_version python)"
EXPECTED_PYTHON_FROM_PYPROJECT="$(get_python_version_from_pyproject)"

assert_version_match "Node manifest" "$EXPECTED_NODE_FROM_TOOL_VERSIONS" "$EXPECTED_NODE_FROM_NVMRC"
assert_version_match "Python manifest" "$EXPECTED_PYTHON_FROM_TOOL_VERSIONS" "$EXPECTED_PYTHON_FROM_PYPROJECT"

printf "${GREEN}Manifest versions agree: Node %s, Python %s${NC}\n" "$EXPECTED_NODE_FROM_TOOL_VERSIONS" "$EXPECTED_PYTHON_FROM_TOOL_VERSIONS"

load_nvm
command -v pyenv >/dev/null 2>&1 || fail "pyenv is required but was not found on PATH. Install pyenv and rerun setup.sh."

printf "Installing pinned Node.js with nvm...\n"
nvm install "$EXPECTED_NODE_FROM_TOOL_VERSIONS"
nvm use "$EXPECTED_NODE_FROM_TOOL_VERSIONS"

printf "Installing pinned Python with pyenv...\n"
pyenv install -s "$EXPECTED_PYTHON_FROM_TOOL_VERSIONS"
eval "$(pyenv init -)"
pyenv shell "$EXPECTED_PYTHON_FROM_TOOL_VERSIONS"

command -v node >/dev/null 2>&1 || fail "node is unavailable after nvm activation."
command -v python >/dev/null 2>&1 || fail "python is unavailable after pyenv activation."
command -v npm >/dev/null 2>&1 || fail "npm is unavailable after nvm activation."
command -v pip >/dev/null 2>&1 || fail "pip is unavailable after pyenv activation."

ACTUAL_NODE="$(node --version | tr -d '[:space:]')"
ACTUAL_NODE="${ACTUAL_NODE#v}"
ACTUAL_PYTHON="$(python -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")' | tr -d '[:space:]')"

assert_version_match "Installed Node version" "$EXPECTED_NODE_FROM_TOOL_VERSIONS" "$ACTUAL_NODE"
assert_version_match "Installed Python version" "$EXPECTED_PYTHON_FROM_TOOL_VERSIONS" "$ACTUAL_PYTHON"

printf "${GREEN}Installed runtime versions match manifests.${NC}\n"
printf "${GREEN}Detected package managers: npm and pip${NC}\n"

if [[ -f package.json ]]; then
  if [[ -f package-lock.json ]]; then
    printf "package.json and package-lock.json detected. Running npm ci...\n"
    npm ci
  else
    printf "package.json detected without package-lock.json. Running npm install...\n"
    npm install
  fi
else
  printf "${YELLOW}No package.json found. Skipping npm ci for this fresh-clone check.${NC}\n"
fi

printf "Installing Python package with dev dependencies...\n"
python -m pip install -e ".[dev]"

printf "Running hello checks...\n"
NODE_HELLO="$(node -e "console.log('hello')" | tr -d '\r')"
PYTHON_HELLO="$(python -c "print('hello')" | tr -d '\r')"

[[ "$NODE_HELLO" == "hello" ]] || fail "Node hello check failed. Expected 'hello', Found '$NODE_HELLO'."
[[ "$PYTHON_HELLO" == "hello" ]] || fail "Python hello check failed. Expected 'hello', Found '$PYTHON_HELLO'."

printf "${GREEN}Hello checks passed for both Node and Python stacks.${NC}\n"

if [[ -f package.json ]]; then
  printf "Running TypeScript checks...\n"
  npm run typecheck
  npm test
fi

printf "Running Python checks...\n"
python -m pytest

printf "${GREEN}Project checks passed for both TypeScript and Python.${NC}\n"
