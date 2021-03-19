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

import socket from '../../lib/socket';
import { is_object, getfield_recursive } from '../../lib/utils';

import Link from 'next/link';
import Router from 'next/router';
import React from 'react';
import Modal from "react-bootstrap/Modal";
import { SketchPicker } from 'react-color';

export default class ZynqConfig extends React.Component {
    #src_id
    #watch_id
    #watch_param
    #source_path
    constructor(props) {
        super(props);
        this._set_paths();
        this.state = { modal: null, ...this._get_state() };
    }
    _set_paths() {
        if (this.#src_id == this.props.src_id)
            return false;
        this.#src_id = this.props.src_id;
        this.#watch_param = { meta: { sources: { [this.#src_id]: 0 }}};
        this.#source_path = ['meta', 'sources', this.#src_id];
        return true;
    }
    _get_state() {
        let params = getfield_recursive(socket.get_cached(this.#watch_param),
                                        this.#source_path);
        let state = {
            name_changed: false, addr_changed: false,
            name: '', addr: '', backgroundColor: '', backgroundColor_temp: ''
        };
        if (!params)
            return state;
        if (params.name)
            state.name = params.name;
        if (params.params) {
            if (params.params.addr) {
                state.addr = params.params.addr;
            }
            if (params.params.backgroundColor) {
                state.backgroundColor = params.params.backgroundColor;
            }
        }
        return state;
    }
    _update = () => {
        let update_state = this._get_state();
        this.setState(state => {
            let new_state = {};
            // Don't update after we've got the initial value
            // or if the user has started typing.
            if (!state.name_changed && !state.name)
                new_state.name = update_state.name;
            if (!state.addr_changed && !state.addr)
                new_state.addr = update_state.addr;
            new_state.backgroundColor = update_state.backgroundColor;
            return new_state;
        });
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

    _save_click = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        let { src_id } = this.props;
        let { name, addr, backgroundColor } = this.state;
        let res = await socket.call('meta', 'config_source',
                                    { id: src_id, name: name,
                                      params: { addr: addr,
                                                backgroundColor: backgroundColor }});
        if (is_object(res)) {
            let msg = res.error;
            if (!msg)
                msg = 'Unknown error';
            this.setState({ modal: { title: 'Error saving configuration', msg }});
        }
        else if (!res) {
            this.setState({ modal: { title: 'Error saving configuration',
                                     msg: 'Unknown error' }});
        }
        else {
            this.setState({ modal: 2 });
        }
    }

    _name_change = (e) => {
        this.setState({ name: e.target.value });
    }
    _addr_change = (e) => {
        this.setState({ addr: e.target.value });
    }
    _backgroundColor_change = (color) => {
        this.setState({ backgroundColor_temp: color.hex });
    }
    _show_delete_confirm = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState({ modal: 1 });
    }
    _show_change_color = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState(state => {
            return { backgroundColor_temp: state.backgroundColor, modal: 3 };
        });
    }
    _confirm_color = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState(state => {
            return { backgroundColor: state.backgroundColor_temp,
                     backgroundColor_temp: '', modal: null };
        });
    }
    _reset_default_color = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState(state => {
            return { backgroundColor_temp: '' };
        });
    }
    _discard_color = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.setState(state => {
            return { backgroundColor_temp: '', modal: null };
        });
    }
    _do_delete = async () => {
        let res = await socket.call('meta', 'remove_source', { id: this.props.src_id });
        if (is_object(res)) {
            let msg = res.error;
            if (!msg)
                msg = 'Unknown error';
            this.setState({ modal: { title: 'Error deleting device', msg }});
        }
        else if (!res) {
            this.setState({ modal: { title: 'Error deleting device',
                                     msg: 'Unknown error' }});
        }
        else {
            Router.push('/');
        }
    }
    _close_modal = () => {
        this.setState({ modal: null });
    }

    render() {
        let { name, addr, backgroundColor, backgroundColor_temp, modal } = this.state;
        let { src_id } = this.props;

        let modal_widget;
        if (modal === 1) {
            modal_widget = <Modal onHide={this._close_modal} show={true}>
              <Modal.Header>Confirm deletion</Modal.Header>
              <Modal.Body>Delete source: {name}</Modal.Body>
              <Modal.Footer>
                <button className="btn btn-danger"
                  onClick={this._do_delete}>Delete</button>
                <button className="btn btn-secondary"
                  onClick={this._close_modal}>Cancel</button>
              </Modal.Footer>
            </Modal>;
        }
        else if (modal === 2) {
            modal_widget = <Modal onHide={this._close_modal} show={true}>
              <Modal.Header>Configure saved</Modal.Header>
              <Modal.Body>Back to device page?</Modal.Body>
              <Modal.Footer>
                <Link href={`/s/zynq/${src_id}`}>
                  <a className="btn btn-primary">Device Page</a>
                </Link>
                <button className="btn btn-secondary"
                  onClick={this._close_modal}>Close</button>
              </Modal.Footer>
            </Modal>;
        }
        else if (modal === 3) {
            modal_widget = <Modal onHide={this._close_modal} show={true}>
              <Modal.Header>Change Background Color</Modal.Header>
              <Modal.Body>
                <SketchPicker className="mx-auto" color={backgroundColor_temp || '#f4f6f9'}
                  onChange={this._backgroundColor_change}/>
              </Modal.Body>
              <Modal.Footer>
                <button className="btn btn-primary"
                  onClick={this._confirm_color}>Select</button>
                <button className="btn btn-light border border-dark"
                  style={{ backgroundColor: '#f4f6f9' }}
                  onClick={this._reset_default_color}>Default</button>
                <button className="btn btn-secondary"
                  onClick={this._discard_color}>Close</button>
              </Modal.Footer>
            </Modal>;
        }
        else if (modal) {
            modal_widget = <Modal onHide={this._close_modal} show={true}>
              <Modal.Header>{modal.title}</Modal.Header>
              <Modal.Body>{modal.msg}</Modal.Body>
              <Modal.Footer>
                <button className="btn btn-secondary"
                  onClick={this._close_modal}>Close</button>
              </Modal.Footer>
            </Modal>;
        }
        else {
            modal_widget = <Modal onHide={this._close_modal} show={false}>
              <Modal.Header></Modal.Header>
              <Modal.Body></Modal.Body>
              <Modal.Footer>
                <button className="btn btn-secondary"
                  onClick={this._close_modal}>Close</button>
              </Modal.Footer>
            </Modal>;
        }


        return <div className="container">
          <div className="row">
            <legend className="text-center">Zynq Device Config</legend>
          </div>
          <form>
            <div className="form-group row">
              <label className="col-sm-3 col-form-label">Name</label>
              <div className="col-sm-9">
                <input className="form-control" value={name} onChange={this._name_change}/>
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-3 col-form-label">Address</label>
              <div className="col-sm-9">
                <input className="form-control" value={addr} onChange={this._addr_change}/>
              </div>
            </div>
            <div className="form-group row">
              <label className="col-sm-3 col-form-label">Background Color</label>
              <div className="col-sm-9">
                <button className="btn btn-light btn-block border border-dark"
                  style={{ backgroundColor: backgroundColor || '#f4f6f9' }}
                  onClick={this._show_change_color}>
                  Change Color
                </button>
              </div>
            </div>
            <hr className={`row my-3`}/>
            <div className="form-group row">
              <div className="col text-center">
                <button className="btn btn-primary"
                  onClick={this._save_click}>Apply</button>
                <span className="mx-2"></span>
                <Link href={`/s/zynq/${src_id}`}>
                  <a className="btn btn-secondary">Back</a>
                </Link>
                <span className="mx-3 border h-100"></span>
                <button className="btn btn-sm btn-danger"
                  onClick={this._show_delete_confirm}>Remove</button>
              </div>
            </div>
          </form>
          {modal_widget}
        </div>;
    }
}
