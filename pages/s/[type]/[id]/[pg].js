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

import Wrapper from '../../../../components/Wrapper';
import CheckLogin from '../../../../components/CheckLogin';
import RedirectIn from '../../../../components/RedirectIn';
import { Pages } from '../../../../components/SourceWidgets';

import socket from '../../../../lib/socket';
import { getfield_recursive } from '../../../../lib/utils';

import Link from 'next/link';
import React from 'react';

export default class Page extends React.Component {
    static async getInitialProps(ctx) {
        let { type, id, pg } = ctx.query;
        let source_id = `${type}-${id}`;
        let props = { src_type: type, source_id: source_id, pg_type: pg };
        let pages = Pages[type];
        if (!pages)
            return props;
        let page = pages[pg];
        if (!page)
            return props;
        let data = page.data;
        if (data)
            props.initvalues = await socket.get({ [source_id]: data }, true, ctx);
        props.init_params =
            await socket.get({'meta': { sources: { [id]: 0 }}}, false, ctx);
        return props;
    }
    #watch_id
    #watch_param
    #color_path
    constructor(props) {
        super(props);
        if (props.initvalues)
            socket.put(...props.initvalues);
        this.#watch_param = { meta: { sources: { [props.src_id]: { params: 0 }}}};
        this.#color_path = ['meta', 'sources', props.src_id, 'params', 'backgroundColor'];
        this.state = { color: getfield_recursive(props.init_params, this.#color_path) };
    }
    _update = () => {
        let params = socket.get_cached(this.#watch_param);
        this.setState({ color: getfield_recursive(params, this.#color_path) });
    }
    _refresh = () => {
        if (!socket.connected) {
            this.#watch_id = undefined;
            return;
        }
        if (this.#watch_id !== undefined)
            return;
        this.#watch_id = socket.watch(this.#watch_param, this._update);
        this._update();
    }
    componentDidMount() {
        socket.on('connect', this._refresh);
        socket.on('disconnect', this._refresh);
        this._refresh();
    }
    componentWillUnmount() {
        if (this.#watch_id !== undefined) {
            socket.unwatch(this.#watch_id);
        }
    }

    _error() {
        return <RedirectIn href="/">
          {(timeout, props) => (<div>
            Unknown page.<br/>
            Redirecting to <Link {...props}><a>home page</a></Link> in {timeout} seconds.
          </div>)}
        </RedirectIn>;
    }
    _render_real() {
        let { src_type, source_id, pg_type } = this.props;
        let pages = Pages[src_type];
        if (!pages)
            return this._error();
        let page = pages[pg_type];
        if (!page)
            return this._error();
        let Widget = page.widget;
        if (!Widget)
            return this._error();
        return <Widget source_id={source_id}/>;
    }
    render() {
        return <Wrapper backgroundColor={this.state.color}>
          <CheckLogin approved={true}>
            {this._render_real()}
          </CheckLogin>
        </Wrapper>;
    }
}
