/*************************************************************************
 *   Copyright (c) 2019 - 2021 Yichao Yu <yyc1992@gmail.com>             *
 *                                                                       *
 *   This library is free software; you can redistribute it and/or       *
 *   modify it under the terms of the GNU Lesser General Public          *
 *   License as published by the Free Software Foundation; either        *
 *   version 3.0 of the License, or (at your option) any later version.  *
 *                                                                       *
 *   This library is distributed in the hope that it will be useful,     *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of      *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU    *
 *   Lesser General Public License for more details.                     *
 *                                                                       *
 *   You should have received a copy of the GNU Lesser General Public    *
 *   License along with this library. If not,                            *
 *   see <http://www.gnu.org/licenses/>.                                 *
 *************************************************************************/

"use strict";

export function simple_click(e) {
    // ignore click for new tab / new window behavior
    if (e.metaKey || e.ctrlKey || e.shiftKey ||
        (e.nativeEvent && e.nativeEvent.which === 2))
        return false;
    return true;
}

// Record the last time of a scroll event
// so that widget on the page can try not to interrupt a continuous scroll in the parent.
export class ScrollWatcher {
    static #last_time = 0
    static #watched = false
    static enable() {
        if (ScrollWatcher.#watched)
            return;
        ScrollWatcher.#watched = true;
        document.addEventListener("wheel", ScrollWatcher.callback);
    }
    static callback(e) {
        if (e.timeStamp && e.timeStamp > ScrollWatcher.#last_time) {
            ScrollWatcher.#last_time = e.timeStamp;
        }
    }
    static last_time() {
        return ScrollWatcher.#last_time;
    }
};
