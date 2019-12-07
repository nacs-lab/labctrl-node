/*************************************************************************
 *   Copyright (c) 2019 - 2019 Yichao Yu <yyc1992@gmail.com>             *
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

import Router from 'next/router';
import React from 'react';

export default class RedirectIn extends React.Component {
    static defaultProps = {
        href: '/'
    };
    constructor(props) {
        super(props);
        this.state = { timeout: props.timeout ? props.timeout : 5 };
        this.timer = 0;
    }
    add_timer() {
        this.timer = setInterval(() => {
            this.setState(({ timeout }) => {
                timeout = timeout - 1;
                if (timeout > 0)
                    return { timeout };
                clearInterval(this.timer);
                this.timer = 0;
                let href = this.props.href;
                let as = this.props.as;
                if (!as)
                    as = href;
                Router[this.props.replace ? 'replace' : 'push'](href, as, {
                    shallow: this.props.shallow,
                });
                return { timeout: 0 };
            });
        }, 1000);
    }
    componentDidMount() {
        this.add_timer();
    }
    componentWillUnmount() {
        if (this.timer != 0) {
            clearInterval(this.timer);
        }
    }
    render() {
        let props = { ...this.props };
        delete props.timeout;
        return this.props.children(this.state.timeout, props);
    }
}
