/**
 * Copyright 2025 Digitalone
 * Copyright 2024-25 Alexander Browne
 * Copyright 2020 Evan Welsh (https://gjs.guide/extensions/review-guidelines/review-guidelines.html#remove-main-loop-sources)
 * Copyright 2020 Jeff Channell (https://github.com/jeffchannell/jiggle/blob/master/cursor.js)
 */

/**
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import GLib from "gi://GLib";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";

export default class HideCursor extends Extension {
  enable() {
    // Configuration.
    const checkEvery = 1; // Seconds.
    const disappearAfter = 3000000; // MicroSeconds.

    // Retrieve Cursor Tracker.
    try {
      this._tracker = global.backend.get_cursor_tracker();
    } catch (e) {
      console.error("Failed to initialize cursor tracker:", e);
      return;
    }

    // Internals.
    this._tick = GLib.get_monotonic_time(); // MicroSeconds (reset on every cursor move).
    this._visible = true; // Visibility flag to perform less work.

    // Set GLib timeout callback.
    this._hide = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      checkEvery,
      () => {
        if (
          this._visible &&
          GLib.get_monotonic_time() - this._tick >= disappearAfter
        ) {
          this._tracker.set_pointer_visible(false);
          this._visible = false;
        }
        return GLib.SOURCE_CONTINUE;
      }
    );

    // Callbacks.
    const updateTick = () => {
      if (this._tracker?.get_pointer_visible()) {
        this._tick = GLib.get_monotonic_time();

        if (this._visible === false) {
          this._visible = true;
        }
      }
    };

    // Connect callback to tracker signals.
    this._resetOnMotion = this._tracker.connect(
      "position-invalidated",
      updateTick
    );
    this._resetOnVisibility = this._tracker.connect(
      "visibility-changed",
      updateTick
    );
    this._resetOnNewCursor = this._tracker.connect(
      "cursor-changed",
      updateTick
    );
  }

  disable() {
    // Cleanup.
    if (this._tracker) {
      this._tracker.set_pointer_visible(true);
    }

    if (this._hide) {
      GLib.Source.remove(this._hide);
      this._hide = null;
    }

    if (this._resetOnMotion) {
      this._tracker.disconnect(this._resetOnMotion);
      this._resetOnMotion = null;
    }

    if (this._resetOnVisibility) {
      this._tracker.disconnect(this._resetOnVisibility);
      this._resetOnVisibility = null;
    }

    if (this._resetOnNewCursor) {
      this._tracker.disconnect(this._resetOnNewCursor);
      this._resetOnNewCursor = null;
    }
  }
}
