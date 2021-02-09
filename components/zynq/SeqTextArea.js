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

import SeqDecorator from './SeqDecorator';

import {
    Editor,
    EditorBlock,
    EditorState,
    RichUtils,
    convertFromRaw,
} from 'draft-js';

import React from 'react';

class Line extends React.Component {
    render () {
        const blockMap = this.props.contentState.getBlockMap().toArray();
        const blockKey = this.props.block.key;
        const lineNumber = blockMap.findIndex(block => blockKey === block.key) + 1;
        return <div style={{display: 'flex'}}>
          <span className="text-secondary nacs-code-line" data-line-number={lineNumber}/>
          <EditorBlock {...this.props}/>
        </div>;
    }
};

function blockRendererFn() {
    return { component: Line, editable: true };
}

class Converter {
    #id = 0
    convert(text) {
        let blocks = [];
        for (let line of text.split('\n')) {
            let id = this.#id;
            this.#id += 1;
            blocks.push({
                key: `HFav-nacs-${id}`,
                text: line,
                type: 'unstyled',
                depth: 0,
                inlineStyleRanges: [],
                entityRanges: [],
                data: {},
            });
        }
        return convertFromRaw({ blocks: blocks, entityMap: {}});
    }
};

export default class SeqTextArea extends React.Component {
    #editor
    #converter = new Converter
    // These are the most up to date state,
    // the reference in `this.state` is only used for `render()`
    #editor_state
    #saved_content
    constructor(props) {
        super(props);
        let { init_text = '' } = this.props;
        this.#editor_state = EditorState.createWithContent(
            this.#converter.convert(init_text), SeqDecorator);
        this.#saved_content = this.#editor_state.getCurrentContent();
        this.#editor = React.createRef();
        this.state = { editor_state: this.#editor_state };
    }

    _fire_on_change() {
        let { onChange } = this.props;
        if (onChange) {
            onChange(this);
        }
    }
    _editor_change = (editor_state) => {
        this.#editor_state = editor_state;
        this._fire_on_change();
        this.setState({ editor_state });
    }
    _editor_key = (command) => {
        const new_state = RichUtils.handleKeyCommand(this.#editor_state, command);
        if (new_state) {
            this._editor_change(new_state);
            return true;
        }
        return false;
    }

    focus() {
        this.#editor.current.focus();
    }
    get_content() {
        return this.#editor_state.getCurrentContent();
    }
    get_text() {
        return this.get_content().getPlainText();
    }
    set_text(text) {
        this.#editor_state = EditorState.createWithContent(
            this.#converter.convert(text), SeqDecorator);
        this.#saved_content = this.#editor_state.getCurrentContent();
        return this.setState({ editor_state: this.#editor_state });
    }
    set_saved(content) {
        this.#saved_content = content;
        this._fire_on_change();
    }
    changed() {
        return this.#editor_state.getCurrentContent() !== this.#saved_content;
    }

    render() {
        const { editor_state } = this.state;

        return <Editor
                 editorState={editor_state}
                 handleKeyCommand={this._editor_key}
                 onChange={this._editor_change}
                 editorKey="seq-editor"
                 blockRendererFn={blockRendererFn}
                 spellCheck={false}
                 ref={this.#editor}/>;
    }
}
