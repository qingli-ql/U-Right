CONFIG ?= Debug
APP_INSTALL_PATH ?= /Applications/U-Right.app

.PHONY: build run native-run install clean open-extension-settings tail-logs team-id dev-build dev-install dev native-dev-run dev-run reload-extension electron-dev electron-build

build:
	./scripts/build_app.sh $(CONFIG)

team-id:
	@./scripts/detect_team.sh

dev-build:
	@DEVELOPMENT_TEAM="$$(./scripts/detect_team.sh)" ALLOW_PROVISIONING_UPDATES=1 ./scripts/build_app.sh $(CONFIG)

run:
	./scripts/dev_electron.sh $(CONFIG)

dev:
	./scripts/dev_electron.sh $(CONFIG)

dev-run:
	./scripts/dev_electron.sh $(CONFIG)

native-run:
	./scripts/run_app.sh $(CONFIG)

native-dev-run:
	@DEVELOPMENT_TEAM="$$(./scripts/detect_team.sh)" ALLOW_PROVISIONING_UPDATES=1 ./scripts/run_app.sh $(CONFIG)

install:
	./scripts/install_app.sh $(CONFIG)

dev-install:
	@DEVELOPMENT_TEAM="$$(./scripts/detect_team.sh)" ALLOW_PROVISIONING_UPDATES=1 ./scripts/install_app.sh $(CONFIG)

reload-extension:
	./scripts/reload_extension.sh $(APP_INSTALL_PATH)

electron-dev:
	./scripts/dev_electron.sh $(CONFIG)

electron-build:
	npm run electron:build

clean:
	rm -rf .build build/xcode

open-extension-settings:
	open 'x-apple.systempreferences:com.apple.ExtensionsPreferences'

tail-logs:
	tail -f "$${HOME}/Library/Application Support/U-Right/uright.log"
