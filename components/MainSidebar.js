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

import socket from '../lib/socket';
import { getfield_recursive } from '../lib/utils';

import GlobalContext from './Global';
import { Pages } from './SourceWidgets';

import { withRouter } from 'next/router';
import Link from 'next/link';
import React from 'react';

const meta_params = { meta: 0 };
const source_path = ['meta', 'sources'];

class MainSidebar extends React.Component {
    static contextType = GlobalContext;
    #watch_id
    constructor(props) {
        super(props);
        this.state = this._source_state();
    }

    _source_state() {
        let sources = getfield_recursive(socket.get_cached(meta_params), source_path);
        let ary = [];
        if (sources) {
            for (let id of Object.getOwnPropertyNames(sources)) {
                ary.push({ id, ...sources[id] });
            }
        }
        return { sources: ary };
    }
    _update = () => {
        this.setState(this._source_state());
    }

    _refresh = () => {
        if (!socket.connected) {
            this.#watch_id = undefined;
            return;
        }
        if (this.#watch_id !== undefined)
            return;
        this.#watch_id = socket.watch(meta_params, this._update);
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

    _render_items() {
        if (!this.context.user)
            return <li className="nav-item">
              <span className="nav-link">
                <Link href="/login">
                  <a> Login </a>
                </Link> to see more options
              </span>
            </li>;

        if (!this.context.user.approved)
            return <li className="nav-item">
              <span className="nav-link">
                Waiting for approval
              </span>
            </li>;

        let router = this.props.router;
        let { type: active_type, id: active_id, pg: active_pg } = router.query;
        let on_src_page = router.pathname == '/s/[type]/[id]/[pg]' &&
                          active_type && active_id && active_pg;

        let is_active = (type, id, pg) => {
            if (!on_src_page)
                return false;
            if (type != active_type || id != active_id)
                return false;
            if (pg && active_pg != pg)
                return false;
            return true;
        };

        let items = [];
        for (let { type, id, name } of this.state.sources) {
            let page_links = [];
            let pages = Pages[type];
            if (!pages)
                continue;
            for (let pg in pages) {
                let page = pages[pg];
                let active = is_active(type, id, pg);
                page_links.push(<li className="nav-item" key={pg}>
                  <Link href={`/s/${type}/${id}/${pg}`}>
                    <a href="#" className={`nav-link ${active ? 'active' : ''}`}>
                      <i className="far fa-circle nav-icon"></i>
                      <p>{page.name}</p>
                    </a>
                  </Link>
                </li>);
            }

            let active = is_active(type, id);
            items.push(<li className="nav-item menu-open" key={`${type}-${id}`}>
              <a href="#" className={`nav-link ${active ? 'active' : ''}`}>
                <i className="fas fa-th nav-icon"></i>
                <p>{name} <i className="right fas fa-angle-left"/></p>
              </a>
              <ul className="nav nav-treeview">
                {page_links}
              </ul>
            </li>);
        }
        return items;
    }

    render() {
        return <nav className="mt-2">
          <ul className="nav nav-flat nav-pills nav-sidebar flex-column"
            data-widget="treeview" role="menu" data-accordion="false">
            {this._render_items()}
          </ul>
        </nav>;
    }
};

export default withRouter(MainSidebar);
