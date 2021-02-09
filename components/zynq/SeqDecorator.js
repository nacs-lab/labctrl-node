/*************************************************************************
 *   Copyright (c) 2021 - 2021 Yichao Yu <yyc1992@gmail.com>             *
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

import React from 'react';

import { List } from 'immutable';

const CLS = {
    None: 0,
    Name: 1,
    Symbol: 2,
    Number: 3,
    Unit: 4,
    Comment: 5,
    Error: 6
};

class CodeComponent extends React.Component {
    render() {
        let { children, style = {}, className = '' } = this.props;
        return <code className={`text-monospace ${className}`}
                 style={{ fontFamily: '"Inconsolata", "Menlo", "Consolas", monospace',
                          ...style }}>
          {children}
        </code>;
    };
};

const float_regex = /^[+-]?([0-9]+\.?[0-9]*|[0-9]*\.[0-9]+)([eE][-+]?[0-9]+|)/;

function decorate_line(text) {
    const decorations = Array(text.length).fill(CLS.None);

    let offset = 0;
    let m;

    let mark_prefix = (prefix, cls) => {
        let end = offset + prefix.length;
        decorations.fill(cls, offset, offset + prefix.length);
        offset = end;
        text = text.substr(prefix.length);
    };
    let check_mark_prefix = (prefix, cls) => {
        if (text.substr(0, prefix.length) == prefix) {
            mark_prefix(prefix, cls);
            return true;
        }
        return false;
    };
    let mark_regex_prefix = (regex, cls) => {
        let m;
        if (!(m = text.match(regex)))
            return false;
        mark_prefix(m[0], cls);
        return true;
    };
    let skip_whitespace = () => {
        return mark_regex_prefix(/^\s+/, CLS.None);
    };
    let mark_error = () => {
        if (!mark_regex_prefix(/^\w+/, CLS.Error) &&
            !mark_regex_prefix(/^\S+/, CLS.Error))
            mark_prefix(text, CLS.Error);
        return decorations;
    };
    let mark_waittime = () => {
        if (mark_regex_prefix(/^0[xX][0-9a-fA-F]*/, CLS.Number)) {
        }
        else if (mark_regex_prefix(float_regex, CLS.Number)) {
            skip_whitespace();
            let m;
            if (!(m = text.match(/^\w+/)))
                return mark_error();
            if (m[0] == 'ns' || m[0] == 'us' || m[0] == 'ms' || m[0] == 's') {
                mark_prefix(m[0], CLS.Unit);
            }
            else {
                return mark_error();
            }
        }
        else {
            return mark_error();
        }
    };

    // Match comments
    if (m = text.match(/^([^#]*[^#\s]|)\s*#/)) {
        let old_len = text.length;
        text = m[1];
        decorations.fill(CLS.Comment, text.length, old_len);
    }
    // Empty line (or comment only)
    if (m = text.match(/^\s*$/))
        return decorations;
    skip_whitespace();
    if (!(m = text.match(/^\w+/)))
        return mark_error();
    if (m[0] == 'ttl') {
        mark_prefix(m[0], CLS.Name);
        skip_whitespace();
        if (check_mark_prefix('=', CLS.Symbol)) {
            skip_whitespace();
            if (!mark_regex_prefix(/^(0[xX][0-9a-fA-F]*)/, CLS.Number)) {
                return mark_error();
            }
        }
        else if (check_mark_prefix('(', CLS.Symbol)) {
            skip_whitespace();
            if (!mark_regex_prefix(/^[0-9]+\s*/, CLS.Number))
                return mark_error();
            if (!mark_regex_prefix(/^\)\s*=\s*/, CLS.Symbol))
                return mark_error();
            if (!(m = text.match(/^\w+/)))
                return mark_error();
            if (m[0] == "true" || m[0] == "True" || m[0] == "TRUE" ||
                m[0] == "on" || m[0] == "On" || m[0] == "ON" ||
                m[0] == "1" || m[0] == "false" || m[0] == "False" || m[0] == "FALSE" ||
                m[0] == "off" || m[0] == "Off" || m[0] == "OFF" || m[0] == "0") {
                mark_prefix(m[0], CLS.Number);
            }
            else {
                return mark_error();
            }
        }
        else {
            return mark_error();
        }
        // White space required
        if (text.length == 0)
            return decorations;
        if (!skip_whitespace())
            return mark_error();
        if (!(m = text.match(/^(t\s*)(=\s*)/)))
            return mark_error();
        mark_prefix(m[1], CLS.Name);
        mark_prefix(m[2], CLS.Symbol);
        let res = mark_waittime();
        if (res !== undefined) {
            return res;
        }
    }
    else if (m[0] == 'wait') {
        mark_prefix(m[0], CLS.Name);
        skip_whitespace();
        if (!check_mark_prefix('(', CLS.Symbol))
            return mark_error();
        skip_whitespace();
        let res = mark_waittime();
        if (res !== undefined)
            return res;
        skip_whitespace();
        if (check_mark_prefix(')', CLS.Symbol)) {
            return mark_error();
        }
    }
    else if (m[0] == 'freq') {
        mark_prefix(m[0], CLS.Name);
        skip_whitespace();
        if (!check_mark_prefix('(', CLS.Symbol))
            return mark_error();
        if (!mark_regex_prefix(/^\s*[0-9]+\s*/, CLS.Number))
            return mark_error();
        if (!check_mark_prefix(')', CLS.Symbol))
            return mark_error();
        skip_whitespace();
        if (!check_mark_prefix('=', CLS.Symbol))
            return mark_error();
        skip_whitespace();
        if (mark_regex_prefix(/^0[xX][0-9a-fA-F]*/, CLS.Number)) {
        }
        else if (mark_regex_prefix(float_regex, CLS.Number)) {
            skip_whitespace();
            let m;
            if (!(m = text.match(/^\w+/)))
                return mark_error();
            if (m[0] == 'Hz' || m[0] == 'kHz' || m[0] == 'MHz' || m[0] == 'GHz') {
                mark_prefix(m[0], CLS.Unit);
            }
            else {
                return mark_error();
            }
        }
        else {
            return mark_error();
        }
    }
    else if (m[0] == 'amp') {
        mark_prefix(m[0], CLS.Name);
        skip_whitespace();
        if (!check_mark_prefix('(', CLS.Symbol))
            return mark_error();
        if (!mark_regex_prefix(/^\s*[0-9]+\s*/, CLS.Number))
            return mark_error();
        if (!check_mark_prefix(')', CLS.Symbol))
            return mark_error();
        skip_whitespace();
        if (!check_mark_prefix('=', CLS.Symbol))
            return mark_error();
        skip_whitespace();
        if (mark_regex_prefix(/^0[xX][0-9a-fA-F]*/, CLS.Number)) {
        }
        else if (mark_regex_prefix(float_regex, CLS.Number)) {
        }
        else {
            return mark_error();
        }
    }
    else if (m[0] == 'phase') {
        mark_prefix(m[0], CLS.Name);
        skip_whitespace();
        if (!check_mark_prefix('(', CLS.Symbol))
            return mark_error();
        if (!mark_regex_prefix(/^\s*[0-9]+\s*/, CLS.Number))
            return mark_error();
        if (!check_mark_prefix(')', CLS.Symbol))
            return mark_error();
        skip_whitespace();
        if (!check_mark_prefix('=', CLS.Symbol) && !check_mark_prefix('-=', CLS.Symbol) &&
            !check_mark_prefix('+=', CLS.Symbol))
            return mark_error();
        skip_whitespace();
        if (mark_regex_prefix(/^0[xX][0-9a-fA-F]*/, CLS.Number)) {
        }
        else if (mark_regex_prefix(float_regex, CLS.Number)) {
            skip_whitespace();
            let m;
            if (!(m = text.match(/^\w+/)))
                return mark_error();
            if (m[0] == '%' || m[0] == 'deg' || m[0] == 'pi' || m[0] == 'rad') {
                mark_prefix(m[0], CLS.Unit);
            }
            else {
                return mark_error();
            }
        }
        else {
            return mark_error();
        }
    }
    else if (m[0] == 'reset') {
        mark_prefix(m[0], CLS.Name);
        skip_whitespace();
        if (!check_mark_prefix('(', CLS.Symbol))
            return mark_error();
        if (!mark_regex_prefix(/^\s*[0-9]+\s*/, CLS.Number))
            return mark_error();
        if (!check_mark_prefix(')', CLS.Symbol)) {
            return mark_error();
        }
    }
    else if (m[0] == 'dac') {
        mark_prefix(m[0], CLS.Name);
        skip_whitespace();
        if (!check_mark_prefix('(', CLS.Symbol))
            return mark_error();
        if (!mark_regex_prefix(/^\s*[0-9]+\s*/, CLS.Number))
            return mark_error();
        if (!check_mark_prefix(')', CLS.Symbol))
            return mark_error();
        skip_whitespace();
        if (!check_mark_prefix('=', CLS.Symbol) && !check_mark_prefix('-=', CLS.Symbol) &&
            !check_mark_prefix('+=', CLS.Symbol))
            return mark_error();
        skip_whitespace();
        if (mark_regex_prefix(/^0[xX][0-9a-fA-F]*/, CLS.Number)) {
        }
        else if (mark_regex_prefix(float_regex, CLS.Number)) {
            skip_whitespace();
            let m;
            if (!(m = text.match(/^\w+/)))
                return mark_error();
            if (m[0] == 'V' || m[0] == 'mV') {
                mark_prefix(m[0], CLS.Unit);
            }
            else {
                return mark_error();
            }
        }
        else {
            return mark_error();
        }
    }
    else if (m[0] == 'clock') {
        mark_prefix(m[0], CLS.Name);
        skip_whitespace();
        if (!check_mark_prefix('(', CLS.Symbol))
            return mark_error();
        if (mark_regex_prefix(/^\s*[0-9]+\s*/, CLS.Number)) {
        }
        else if (check_mark_prefix('off', CLS.Symbol)) {
        }
        else {
            return mark_error();
        }
        if (!check_mark_prefix(')', CLS.Symbol)) {
            return mark_error();
        }
    }
    else {
        return mark_error();
    }
    skip_whitespace();
    if (text.length == 0)
        return decorations;
    return mark_error();
}

export default class SeqDecorator {
    static getComponentForKey(key) {
        return CodeComponent;
    }

    static getPropsForKey(key) {
        if (key == CLS.None)
            return { className: "text-body" };
        if (key == CLS.Name)
            return { className: "text-primary" };
        if (key == CLS.Symbol)
            return { style: { color: '#ab47ec' }};
        if (key == CLS.Number)
            return { className: "text-success" };
        if (key == CLS.Unit)
            return { className: "text-info" };
        if (key == CLS.Comment)
            return { className: "text-secondary" };
        if (key == CLS.Error)
            return { className: "text-danger" };
        return {};
    }

    static getDecorations(block) {
        // When Copy&Pasting/multiple line from input method,
        // we can get more than one line here.
        let text = block.getText();
        let lines = text.split('\n');
        if (lines.length == 1)
            return List(decorate_line(text));
        let res = [];
        let first = true;
        for (let line of lines) {
            if (!first)
                res.push(null);
            first = false;
            res = [...res, ...decorate_line(line)];
        }
        return List(res);
    }
};
