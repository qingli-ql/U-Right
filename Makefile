CONFIG ?= debug

.PHONY: build run install clean open-extension-settings tail-logs

build:
	./scripts/build_app.sh $(CONFIG)

run:
	./scripts/run_app.sh

install:
	./scripts/install_app.sh

clean:
	rm -rf .build build

open-extension-settings:
	open 'x-apple.systempreferences:com.apple.ExtensionsPreferences'

tail-logs:
	tail -f "$${HOME}/Library/Application Support/U-Right/uright.log"
