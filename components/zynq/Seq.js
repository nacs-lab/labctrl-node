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

import SeqTextArea from './SeqTextArea';
import StatusField from './StatusField';

import React from 'react';
import Modal from "react-bootstrap/Modal";
import Form from 'react-bootstrap/Form';

function SyntaxError(props) {
    let { msg, line, lineno = -1, colnum = -1, colstart = -1, colend = -1 } = props;
    if (!msg || !line)
        return <b>Unknown error.</b>;
    let l1 = undefined;
    let l2 = undefined;
    if (lineno > 0) {
        let lineno_s = ' ' + String(lineno);
        l1 = <code className="text-secondary">{lineno_s}|</code>;
        l2 = <code className="text-secondary">{' '.repeat(lineno_s.length)}|</code>;
    }
    if (colstart > 0 && colend > 0) {
        l1 = <>
          {l1}
          <code>{line.substring(0, colstart - 1)}</code>
          <code className="text-danger">{line.substring(colstart - 1, colend)}</code>
          <code>{line.substring(colend)}</code>
        </>;
        l2 = <>
          {l2}
          <code>{' '.repeat(colstart - 1)}</code>
        </>;
        if (colnum >= colstart && colnum <= colend) {
            l2 = <>
              {l2}
              <code className="text-warning">{'~'.repeat(colnum - colstart)}</code>
              <code className="text-danger">{'^'}</code>
              <code className="text-warning">{'~'.repeat(colend - colnum)}</code>
            </>;
        }
        else {
            l2 = <>
              {l2}
              <code className="text-danger">{'~'.repeat(colend - colstart + 1)}</code>
            </>;
        }
    }
    else if (colnum > 0) {
        l1 = <>
          {l1}
          <code>{line.substring(0, colnum - 1)}</code>
          <code className="text-danger">{line.substring(colnum - 1, colnum)}</code>
          <code>{line.substring(colnum)}</code>
        </>;
        l2 = <>
          {l2}
          <code>{' '.repeat(colnum - 1)}</code>
          <code className="text-danger">{'^'}</code>
        </>;
    }
    else {
        l1 = <>
          {l1}
          <code>{line}</code>
        </>;
        l2 = undefined;
    }
    return <div>
      <span>SyntaxError: <b>{msg}</b></span>
      <pre className="p-1">
        <p className="my-0">{l1}</p>
        {l2 !== undefined ? <p className="my-0">{l2}</p> : undefined}
      </pre>
    </div>;
}

// Status:
// * `null`: nothing
// * `1`: running
// * `2`: cancelled
// * `3`: finished
// * <object>: error

// Filename:
// * `null`: new sequence
// * `true`: startup
// * <string>: normal sequence

const ModalType = {
    NewConfirm: 1,
    SaveBeforeNew: 2,
    OpenConfirm: 3,
    SaveBeforeOpen: 4,
    Open: 5,
    SaveAs: 6,
    DeleteConfirm: 7
};

export default class Seq extends React.Component {
    #textarea
    #seq_id
    constructor(props) {
        super(props);
        this.#textarea = React.createRef();
        this.state = {
            status: null,
            filename: null,
            changed: false,
            modal_type: null,
            modal_state: null,
        };
    }

    _click_textarea = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.#textarea.current) {
            this.#textarea.current.focus();
        }
    }
    _click_run = async () => {
        if (!this.#textarea.current)
            return;
        // Already running. React update delay.
        if (this.#seq_id)
            return;
        let seq = this.#textarea.current.get_text();
        let res = await socket.call(this.props.source_id, 'run_cmdlist', seq);
        if (res instanceof Array) {
            this.#seq_id = res[0];
            this.setState({ status: 1 });
        }
        else if (is_object(res)) {
            this.setState({ status: { error: res } });
            return;
        }
        else {
            this.setState({ status: { error: 'Unknown error starting the sequence.' }});
            return;
        }
        if (await socket.call(this.props.source_id, 'wait_seq', { id: res[0], type: 2 })) {
            this.setState({ status: 3 });
        }
        else {
            this.setState({ status: 2 });
        }
        this.#seq_id = undefined;
    }
    _click_cancel = (e) => {
        if (!this.#textarea.current)
            return;
        // Not running. React update delay.
        if (!this.#seq_id)
            return;
        socket.call(this.props.source_id, 'cancel_seq', this.#seq_id);
    }

    // Final action (with the exception of `_do_save`, these all closes the modal.)
    _do_new = () => {
        this.#textarea.current.set_text('');
        this.setState({ status: null,
                        filename: null,
                        changed: false,
                        modal_type: null,
                        modal_state: null });
    }
    async _do_open(name) {
        let seq;
        if (name === true) {
            // Get startup
            seq = await socket.call(this.props.source_id, 'get_startup');
        }
        else {
            seq = await socket.call(this.props.source_id, 'read_seq', { name: name });
        }
        this.#textarea.current.set_text(seq);
        this.setState({ status: null,
                        filename: name,
                        changed: false,
                        modal_type: null,
                        modal_state: null });
    }
    async _do_save(title, type) {
        let name = this.state.filename;
        if (name === null) {
            this._show_save_as(title, type);
            return;
        }
        this._do_save_as(name);
    }
    async _do_save_as(name) {
        if (name === null)
            return;
        let content = this.#textarea.current.get_content();
        let seq = content.getPlainText();
        if (name === true) {
            // Set startup
            let res = await socket.call(this.props.source_id, 'set_startup', seq);
            if (res === true) {
                this.#textarea.current.set_saved(content);
            }
            else if (is_object(res)) {
                this.setState({ status: { error: res } });
            }
            else {
                this.setState({ status: { error: 'Unknown error setting startup sequence.' }});
            }
        }
        else {
            let res = await socket.call(this.props.source_id, 'write_seq',
                                        { name: name, seq: seq, ovr: true });
            if (res === true) {
                this.#textarea.current.set_saved(content);
            }
            else {
                this.setState({ status: { error: 'Unknown error saving sequence.' }});
            }
        }
        this._close_modal();
    }
    _do_delete = async () => {
        let name = this.state.filename;
        await socket.call(this.props.source_id, 'delete_seq', { name: name });
        this._do_new();
    }

    // Bring up or close the corresponding modal.
    _show_new_confirm() {
        this.setState({ modal_type: ModalType.NewConfirm,
                        modal_state: null });
    }
    _show_open_confirm() {
        this.setState({ modal_type: ModalType.OpenConfirm,
                        modal_state: null });
    }
    _show_open = async () => {
        this.setState({ modal_type: ModalType.Open,
                        modal_state: { seqs: null, value: '' }});
        let seqs = await socket.call(this.props.source_id, 'get_seq_names');
        this.setState((state) => {
            // Ooops, too late...
            if (state.modal_type !== ModalType.Open || state.modal_state.seqs)
                return {};
            return { modal_state: { ...state.modal_state, seqs }};
        });
    }
    _show_save_as(title, type) {
        this.setState({ modal_type: type,
                        modal_state: { title: title, name: '' }});
    }
    _show_delete_confirm = () => {
        this.setState({ modal_type: ModalType.DeleteConfirm,
                        modal_state: null });
    }
    _close_modal = () => {
        this.setState({ modal_type: null,
                        modal_state: null });
    }

    // Toolbar button action
    _click_new = () => {
        if (this.state.changed)
            return this._show_new_confirm();
        this._do_new();
    }
    _click_open = () => {
        if (this.state.changed)
            return this._show_open_confirm();
        this._show_open();
    }
    _click_save = () => {
        this._do_save('Save ...', ModalType.SaveAs);
    }
    _click_save_as = () => {
        this._show_save_as('Save As ...', ModalType.SaveAs);
    }
    // _click_delete = _show_delete_confirm

    // Modal event handlers
    _modal_new_confirm_save = () => {
        this._do_save('Save and create new sequence ...', ModalType.SaveBeforeNew);
    }
    _modal_open_confirm_save = () => {
        this._do_save('Save and open new sequence ...', ModalType.SaveBeforeOpen);
    }

    _modal_open_change = (e) => {
        let value = e.target.value;
        this.setState((state) => {
            return { modal_state: { ...state.modal_state, value }};
        });
    }
    _modal_open_open = () => {
        let value = Number(this.state.modal_state.value);
        if (value === 0)
            return this._do_open(true);
        return this._do_open(this.state.modal_state.seqs[value - 1]);
    }

    _modal_save_as_change = (e) => {
        let name = e.target.value;
        this.setState((state) => {
            return { modal_state: { ...state.modal_state, name }};
        });
    }
    _modal_save_as_save_new = async () => {
        await this._do_save_as(this.state.modal_state.name);
        await this._do_new();
    }
    _modal_save_as_save_open = async () => {
        await this._do_save_as(this.state.modal_state.name);
        await this._show_open();
    }
    _modal_save_as_save = async () => {
        let name = this.state.modal_state.name;
        await this._do_save_as(name);
        this.setState({ filename: name });
        await this._close_modal();
    }

    _on_change = (textarea) => {
        this.setState({ changed: textarea.changed() });
    }

    render () {
        let running = this.state.status === 1;
        let name = this.state.filename;
        let new_file = name === null;
        let startup = name === true;
        let changed = this.state.changed;
        let can_new = changed || !new_file;
        let can_delete = !startup && !new_file;
        // I use `/.../` here simply because `/` cannot be in the name of normal sequence.
        if (new_file) {
            name = '/New Sequence/';
        }
        else if (startup) {
            name = '/Startup/';
        }
        name = <div className={`d-inline-block ${changed ? 'text-info' : ''}`}
                 title={changed ? 'Sequence modified' : undefined}>{name}
          {running ?
           <div className="spinner-border spinner-border-sm text-info align-middle"
             role="status" title="Running"/> : undefined}
        </div>;

        let modal_type = this.state.modal_type;
        let modal_state = this.state.modal_state;
        let modal_widget;
        switch (modal_type) {
            case ModalType.NewConfirm:
                modal_widget = <Modal onHide={this._close_modal} show={true}>
                  <Modal.Header><b>Current sequence not saved</b></Modal.Header>
                  <Modal.Body>Save before creating new sequence?</Modal.Body>
                  <Modal.Footer>
                    <button className="btn btn-primary"
                      onClick={this._modal_new_confirm_save}>Save</button>
                    <button className="btn btn-danger"
                      onClick={this._do_new}>Disgard</button>
                    <button className="btn btn-secondary"
                      onClick={this._close_modal}>Cancel</button>
                  </Modal.Footer>
                </Modal>;
                break;
            case ModalType.OpenConfirm:
                modal_widget = <Modal onHide={this._close_modal} show={true}>
                  <Modal.Header><b>Current sequence not saved</b></Modal.Header>
                  <Modal.Body>Save before opening new sequence?</Modal.Body>
                  <Modal.Footer>
                    <button className="btn btn-primary"
                      onClick={this._modal_open_confirm_save}>Save</button>
                    <button className="btn btn-danger"
                      onClick={this._show_open}>Disgard</button>
                    <button className="btn btn-secondary"
                      onClick={this._close_modal}>Cancel</button>
                  </Modal.Footer>
                </Modal>;
                break;
            case ModalType.Open:
                let seqs = modal_state.seqs;
                let loading = seqs === null;
                let options = [<option value={0} key={0}>/Startup/</option>];
                if (seqs) {
                    for (let i = 0; i < seqs.length; i++) {
                        options.push(<option value={i + 1} key={i + 1}>{seqs[i]}</option>);
                    }
                }
                modal_widget = <Modal onHide={this._close_modal} show={true}>
                  <Modal.Header><b>Open sequence</b></Modal.Header>
                  <Modal.Body>
                    <Form>
                      <Form.Group controlId="seq.open">
                        {
                            loading ? <Form.Label>Loading...</Form.Label> : undefined
                        }
                        <Form.Control as="select" htmlSize={3}
                          value={modal_state.value}
                          onChange={this._modal_open_change} custom>
                          {options}
                        </Form.Control>
                      </Form.Group>
                    </Form>
                  </Modal.Body>
                  <Modal.Footer>
                    <button className="btn btn-primary"
                      onClick={this._modal_open_open}>Open</button>
                    <button className="btn btn-secondary"
                      onClick={this._close_modal}>Cancel</button>
                  </Modal.Footer>
                </Modal>;
                break;
            case ModalType.SaveBeforeNew:
            case ModalType.SaveBeforeOpen:
            case ModalType.SaveAs:
                let save_cb;
                if (modal_type == ModalType.SaveBeforeNew) {
                    save_cb = this._modal_save_as_save_new;
                }
                else if (modal_type == ModalType.SaveBeforeOpen) {
                    save_cb = this._modal_save_as_save_open;
                }
                else {
                    save_cb = this._modal_save_as_save;
                }
                modal_widget = <Modal onHide={this._close_modal} show={true}>
                  <Modal.Header><b>{modal_state.title}</b></Modal.Header>
                  <Modal.Body>
                    <input type="text" className="form-control"
                      value={modal_state.name} onChange={this._modal_save_as_change}/>
                  </Modal.Body>
                  <Modal.Footer>
                    <button className="btn btn-primary"
                      onClick={save_cb}>Save</button>
                    <button className="btn btn-secondary"
                      onClick={this._close_modal}>Cancel</button>
                  </Modal.Footer>
                </Modal>;
                break;
            case ModalType.DeleteConfirm:
                modal_widget = <Modal onHide={this._close_modal} show={true}>
                  <Modal.Header><b>Confirm deletion</b></Modal.Header>
                  <Modal.Body>Delete current sequence?</Modal.Body>
                  <Modal.Footer>
                    <button className="btn btn-danger"
                      onClick={this._do_delete}>Delete</button>
                    <button className="btn btn-secondary"
                      onClick={this._close_modal}>Cancel</button>
                  </Modal.Footer>
                </Modal>;
                break;
            default:
                modal_widget = <Modal onHide={this._close_modal} show={false}>
                  <Modal.Header></Modal.Header>
                  <Modal.Body></Modal.Body>
                  <Modal.Footer></Modal.Footer>
                </Modal>;
        }

        const btn_cls = "btn btn-light border px-2";

        let run_btn = running ?
                      <button type="button" title="Cancel" onClick={this._click_cancel}
                        className={`${btn_cls} text-danger`}>
                        <i className="fas fa-fw fa-stop-circle"/>
                      </button> :
                      <button type="button" title="Run" onClick={this._click_run}
                        className={`${btn_cls} text-success`}>
                        <i className="fas fa-fw fa-play"/>
                      </button>;

        let msg_box;
        let msg_box_cls = '';
        let msg_box_style = {};
        if (this.state.status === 1) {
            msg_box = <b>Sequence running ...</b>;
            msg_box_style.backgroundColor = '#aaebe3';
        }
        else if (this.state.status === 2) {
            msg_box = <b>Sequence cancelled.</b>;
            msg_box_style.backgroundColor = '#ebe36c';
        }
        else if (this.state.status === 3) {
            msg_box = <b>Sequence finished.</b>;
            msg_box_style.backgroundColor = '#95dd94';
        }
        else if (this.state.status === null) {
        }
        else if (this.state.status.error) {
            let err = this.state.status.error;
            if (is_object(err)) {
                msg_box = <SyntaxError {...err}/>;
            }
            else {
                msg_box = <b>{String(err)}</b>;
            }
            msg_box_style.backgroundColor = '#ffcbc0';
        }
        else {
            msg_box = <b>Unknown error.</b>;
            msg_box_style.backgroundColor = '#ffcbc0';
        }

        return <div className="container"
                 style={{ height: '80vh', minHeight: '30em' }}>
          <div className="row d-sm-none">
            <legend className="text-center">
              {name}
              <span className="float-right">
                <StatusField source_id={this.props.source_id}/>
              </span>
            </legend>
          </div>
          <div className="row">
            <div className="col-auto">
              <div className="btn-toolbar mb-2" role="toolbar">
                <div className="btn-group mr-2" role="group">
                  <button type="button" title="New Sequence"
                    className={`${btn_cls} ${can_new ? '' : 'text-secondary'}`}
                    onClick={can_new ? this._click_new : undefined}
                    disabled={!can_new}>
                    <i className="fas fa-fw fa-file"/>
                  </button>
                  <button type="button" title="Open"
                    className={btn_cls} onClick={this._click_open}>
                    <i className="fas fa-fw fa-folder-open"/>
                  </button>
                  <button type="button" title="Save"
                    className={btn_cls} onClick={this._click_save}>
                    <i className="fas fa-fw fa-save"/>
                  </button>
                  <button type="button" title="Save As"
                    className={btn_cls} onClick={this._click_save_as}>
                    <i className="fas fa-fw fa-archive"/>
                  </button>
                  {run_btn}
                </div>
                <button type="button" title="Delete"
                  onClick={can_delete ? this._show_delete_confirm : undefined}
                  className={`${btn_cls} mr-1 ${can_delete ? 'text-danger' : 'text-secondary'}`}
                  disabled={!can_delete}>
                  <i className="fas fa-fw fa-trash-alt"/>
                </button>
              </div>
            </div>
            <div className="col d-none d-sm-block">
              <legend className="text-center">
                {name}
                <span className="float-right">
                  <StatusField source_id={this.props.source_id}/>
                </span>
              </legend>
            </div>
          </div>
          <div className="border h-75" onClick={this._click_textarea}
            style={{ cursor: 'text', overflowY: 'auto' }}>
            <div className="border-left bg-white"
              style={{ marginLeft: '3em', minHeight: '100%' }}>
              <SeqTextArea ref={this.#textarea} onChange={this._on_change}/>
            </div>
          </div>
          {msg_box !== undefined ? <div className={`border mt-1 px-1 ${msg_box_cls}`}
                                     style={{ ...msg_box_style }}>
            {msg_box}
          </div> : undefined}
          {modal_widget}
        </div>;
    }
};
