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
    const disappearAfter = 2000000; // MicroSeconds.

    // Internals.
    try {
      this._tracker = global.backend.get_cursor_tracker(global.display);
      this._tick = GLib.get_monotonic_time(); // Reset on every cursor move.
      this._visible = true; // Lower when hidden to perform less work.
    } catch (e) {
      console.error("Failed to initialize internals:", e);
      return;
    }

    // Callbacks.
    this._hide = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      checkEvery,
      () => {
        if (this._visible === true) {
          const elapsed = GLib.get_monotonic_time() - this._tick; // MicroSeconds.

          if (elapsed >= disappearAfter) {
            this._tracker.set_pointer_visible(false);
            this._visible = false; // Stop calculating as long as it's hidden.
          }
        }

        return GLib.SOURCE_CONTINUE;
      }
    );

    // Listen for cursor movement using "position-invalidated".
    this._reset = this._tracker.connect("position-invalidated", () => {
      this._tick = GLib.get_monotonic_time();

      if (this._visible === false) {
        this._visible = true;
      }
    });
  }

  disable() {
    // Disconnect callbacks.
    if (this._reset) {
      this._tracker.disconnect(this._reset);
      this._reset = null;
    }

    if (this._hide) {
      GLib.Source.remove(this._hide);
      this._hide = null;
    }

    if (this._tracker) {
      this._tracker.set_pointer_visible(true);
    }
  }
}
