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

#include "parse.h"

#include <nacs-seq/cmdlist.h>

#include <nacs-utils/errors.h>
#include <nacs-utils/streams.h>

#include <nan.h>

#include <exception>
#include <memory>

namespace {

using namespace NaCs;

class ParserWorker : public Nan::AsyncWorker {
public:
    ParserWorker(Nan::Callback *callback, std::string source,
                 v8::Local<v8::Function> parse_error)
        : AsyncWorker(callback, "labctrl:ParserWorker"), m_code(std::move(source))
    {
        // This is the `ParseError` class from js.
        // We'll convert the C++ `SyntaxError` to this below.
        SaveToPersistent(0u, parse_error);
    }

    ~ParserWorker() override
    {}

    // Executed inside the worker-thread.
    // It is not safe to access V8, or V8 data structures
    // here, so everything we need for input and output
    // should go on `this`.
    void Execute() override
    {
        auto data = &m_code[0];
        const_istream istm(data, data + m_code.size());
        string_ostream sstm;
        uint32_t ttl_mask;
        try {
            ttl_mask = Seq::CmdList::parse(sstm, istm);
        }
        catch (const SyntaxError &err) {
            m_error.reset(new SyntaxError(err));
            return;
        }
        catch (const std::exception &err) {
            // Setting the error message let `Nan::AsyncWorker` pass the exception
            // to the callback for us.
            SetErrorMessage(err.what());
            return;
        }
        catch (...) {
            SetErrorMessage("Unknown parser error");
            return;
        }
        m_code = sstm.get_buf();
        // Hard code 10ns per step.
        uint64_t len_ns = Seq::CmdList::total_time((uint8_t*)m_code.data(), m_code.size()) * 10;
        char buff[12];
        // This is the prefix expected by the server.
        memcpy(buff, &len_ns, 8);
        memcpy(buff + 8, &ttl_mask, 4);
        m_code.insert(0, buff, 12);
    }

    static void free_buffer(char *data, void *hint)
    {
        auto str = (std::string*)hint;
        delete str;
    }

    // Executed when the async work is complete
    // this function will be run inside the main event loop
    // so it is safe to use V8 again
    void HandleOKCallback() override
    {
        Nan::HandleScope scope;
        // The callback passed expect up to two argument.
        // The first argument is the error when not `null`.
        // The second argument is the result if presented/no error.

        if (!m_error) {
            // `callback(null, Buffer.from(...))`
            auto str = new std::string(std::move(m_code));
            v8::Local<v8::Value> argv[] = {
                Nan::Null(), Nan::NewBuffer(&(*str)[0], str->size(),
                                            &free_buffer, str).ToLocalChecked()
            };
            callback->Call(2, argv, async_resource);
            return;
        }

        // `callback(new ParseError(...))`
        auto &emsg = m_error->msg();
        auto &line = m_error->line();
        std::array<int,3> cols;
        cols[0] = m_error->columns(&cols[1], &cols[2]);
        v8::Local<v8::Value> parse_errargv[] = {
            Nan::Encode(emsg.data(), emsg.size()),
            Nan::Encode(line.data(), line.size()),
            Nan::New<v8::Int32>(m_error->lineno()),
            Nan::New<v8::Int32>(cols[0]),
            Nan::New<v8::Int32>(cols[1]),
            Nan::New<v8::Int32>(cols[2]),
        };
        auto parse_error = v8::Local<v8::Function>::Cast(GetFromPersistent(0u));
        v8::Local<v8::Value> argv[] = {
            Nan::NewInstance(parse_error, 6, parse_errargv).ToLocalChecked()
        };
        callback->Call(1, argv, async_resource);
    }

private:
    std::string m_code;
    std::unique_ptr<SyntaxError> m_error;
};

}

// Asynchronous access to the `Seq::CmdList::parse` function
NAN_METHOD(ParseCmdList)
{
    Nan::HandleScope scope;
    if (info.Length() < 3) {
        Nan::ThrowTypeError("3 arguments expected");
        return;
    }
    Nan::Utf8String source(Nan::To<v8::String>(info[0]).ToLocalChecked());
    auto parse_error = v8::Local<v8::Function>::Cast(info[1]);
    auto callback = v8::Local<v8::Function>::Cast(info[2]);
    Nan::AsyncQueueWorker(new ParserWorker(new Nan::Callback(callback), std::string(*source),
                                           parse_error));
}
