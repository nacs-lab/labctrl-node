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

import Wrapper from '../../../components/Wrapper';
import CheckLogin from '../../../components/CheckLogin';
import RedirectIn from '../../../components/RedirectIn';
import { Pages } from '../../../components/SourceWidgets';

import socket from '../../../lib/socket';
import { getfield_recursive } from '../../../lib/utils';

import Link from 'next/link';
import React from 'react';

export default class Page extends React.Component {
    static async getInitialProps(ctx) {
        let { type, id, pg } = ctx.query;
        let props = { src_type: type, src_id: id, pages: [] };
        let pages = Pages[type];
        if (pages) {
            for (let pg in pages) {
                props.pages.push({ id: pg, name: pages[pg].name });
            }
        }
        return props;
    }
    #watch_id
    #watch_param
    #name_path
    constructor(props) {
        super(props);
        this.#watch_param = { meta: { sources: { [props.src_id]: { name: 0 }}}};
        this.#name_path = ['meta', 'sources', props.src_id, 'name'];
        this.state = { name: this._get_name() };
    }
    _get_name() {
        return getfield_recursive(socket.get_cached(this.#watch_param), this.#name_path);
    }
    _update = () => {
        this.setState({ name: this._get_name() });
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

    _render_real() {
        let { name = '' } = this.state;
        let { pages, src_type, src_id } = this.props;
        let page_btns = [];
        for (let pg of pages)
            page_btns.push(
                <Link href={`/s/${src_type}/${src_id}/${pg.id}`} key={pg.id}>
                  <a className="list-group-item list-group-item-action">
                    {pg.name}
                  </a>
                </Link>);

        return <div className="container">
          <div className="row">
            <legend className="text-center">{name}</legend>
          </div>
          <div className="list-group">
            {page_btns}
          </div>
        </div>;
    }
    render() {
        return <Wrapper>
          <CheckLogin approved={true}>
            {this._render_real()}
          </CheckLogin>
        </Wrapper>;
    }
}
