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
import { is_object } from '../../lib/utils';

import Link from 'next/link';
import Router from 'next/router';
import React from 'react';
import Modal from "react-bootstrap/Modal";

export default class ZynqAdd extends React.Component {
    constructor(props) {
        super(props);
        this.state = { modal: null, name: '', addr: '' };
    }

    _add_click = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        let { src_id } = this.props;
        let { name, addr } = this.state;
        let res = await socket.call('meta', 'add_source', { type: 'zynq', name: name,
                                                            params: { addr: addr }});
        if (is_object(res)) {
            let msg = res.error;
            if (!msg)
                msg = 'Unknown error';
            this.setState({ modal: { title: 'Error adding source', msg }});
        }
        else if (!res) {
            this.setState({ modal: { title: 'Error adding source', msg: 'Unknown error' }});
        }
        else {
            Router.push(`/s/zynq/${res}`);
        }
    }

    _name_change = (e) => {
        this.setState({ name: e.target.value });
    }
    _addr_change = (e) => {
        this.setState({ addr: e.target.value });
    }
    _close_modal = () => {
        this.setState({ modal: null });
    }

    render() {
        let { name, addr, modal } = this.state;
        let { src_id } = this.props;

        let modal_widget;
        if (modal) {
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
            <legend className="text-center">Add Zynq Device</legend>
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
            <hr className={`row my-3`}/>
            <div className="form-group row">
              <div className="col text-center">
                <button className="btn btn-primary"
                  onClick={this._add_click}>Add</button>
                <span className="mx-2"></span>
                <Link href="/" className="btn btn-secondary">Cancel</Link>
              </div>
            </div>
          </form>
          {modal_widget}
        </div>;
    }
}
