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
import { Pages, Widgets } from '../../../components/SourceWidgets';

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
                props.pages.push({ id: pg, name: pages[pg].name,
                                   icon: pages[pg].icon });
            }
        }
        props.init_params =
            await socket.get({'meta': { sources: { [id]: 0 }}}, false, ctx);
        return props;
    }
    #src_id
    #src_type
    #watch_id
    #watch_param
    #name_path
    #color_path
    #status
    constructor(props) {
        super(props);
        this._set_paths();
        this.state = { name: getfield_recursive(props.init_params, this.#name_path),
                       color: getfield_recursive(props.init_params, this.#color_path) };
    }
    _set_paths() {
        if (this.#src_id == this.props.src_id && this.#src_type == this.props.src_type)
            return false;
        this.#src_id = this.props.src_id;
        this.#src_type = this.props.src_type;
        this.#watch_param = { meta: { sources: { [this.#src_id]: 0 }}};
        let widgets = Widgets[this.#src_type];
        if (widgets && widgets.status) {
            if (widgets.status.data)
                this.#watch_param[`${this.#src_type}-${this.#src_id}`] = widgets.status.data();
            this.#status = widgets.status;
        }
        this.#name_path = ['meta', 'sources', this.#src_id, 'name'];
        this.#color_path = ['meta', 'sources', this.#src_id, 'params', 'backgroundColor'];
        return true;
    }
    _update = () => {
        let params = socket.get_cached(this.#watch_param);
        this.setState({ name: getfield_recursive(params, this.#name_path),
                        color: getfield_recursive(params, this.#color_path) });
    }
    _refresh = () => {
        if (!socket.connected) {
            this.#watch_id = undefined;
            return;
        }
        if (this.#watch_id !== undefined && !this._set_paths())
            return;
        if (this.#watch_id !== undefined)
            socket.unwatch(this.#watch_id);
        this.#watch_id = socket.watch(this.#watch_param, this._update);
        this._update();
    }
    componentDidMount() {
        socket.on('connect', this._refresh);
        socket.on('disconnect', this._refresh);
        this._refresh();
    }
    componentDidUpdate() {
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
        for (let pg of pages) {
            let icon_class = 'far fa-circle fa-fw';
            if (pg.icon)
                icon_class = pg.icon;
            page_btns.push(
                <Link href={`/s/${src_type}/${src_id}/${pg.id}`} key={pg.id}>
                  <a className="list-group-item list-group-item-action">
                    <i className={`${icon_class} mr-2`}/>{pg.name}
                  </a>
                </Link>);
        }

        let status_widget;
        if (this.#status) {
            let Widget = this.#status.widget;
            status_widget = <span className="float-right">
              <Widget source_id={`${src_type}-${src_id}`}/>
            </span>;
        }

        return <div className="container">
          <div className="row">
            <legend className="text-center">{name}{status_widget}</legend>
          </div>
          <div className="list-group">
            {page_btns}
          </div>
          <hr/>
          <div className="row">
            <div className="col text-center">
              <Link href={`/s/${src_type}/${src_id}/config`}>
                <a className="btn btn-info">
                  <i className="fas fa-edit mr-2"/>Configure
                </a>
              </Link>
            </div>
          </div>
        </div>;
    }
    render() {
        return <Wrapper backgroundColor={this.state.color}>
          <CheckLogin approved={true}>
            {this._render_real()}
          </CheckLogin>
        </Wrapper>;
    }
}
