#!/usr/bin/env python
import os
from flask import Flask, render_template, Response, request
from main import Wrapper
from stream_handler import MessageAnnouncer, getMergedStream
app = Flask(__name__, static_url_path='', static_folder='../build', template_folder='../build')

MA = MessageAnnouncer()
W = Wrapper()

@app.route("/")
def index():
    return render_template('index.html')

@app.route("/t")
def t():
    print("T")
    return "<h1>T</h1>"

@app.route("/start", methods=['POST'])
def start():
    req = request.json
    W.updateParams(req['method'], req['cleanFreq'], req['iscBudget'], req['k'], req['y3'], req['updateFreq'], req['updateDelay'])
    mockStream = getMergedStream(req['inputFiles'], req['ciID'])
    W.reset(mockStream)
    W.run(MA, req['t1'], req['t2'], req['t3'], req['t4'])
    return "<h1>Finished</h1>"

@app.route("/stop")
def stop():
    W.stop()
    return "<h1>Stopped</h1>"

@app.route("/pause")
def pause():
    W.pause_unpause()
    return "<h1>OK</h1>"

@app.route("/update", methods=['POST'])
def update():
    req = request.json
    W.updateParams(req['method'], req['cleanFreq'], req['iscBudget'], req['k'], req['y3'], req['updateFreq'], req['updateDelay'])
    return "<h1>OK</h1>"

@app.route("/stream")
def s():
    def stream():
        messages = MA.listen()  # returns a queue.Queue
        while True:
            msg = messages.get()  # blocks until a new message arrives
            yield msg

    return Response(stream(), mimetype='text/event-stream')

if __name__ == "__main__":
    app.run(host='::1', port=os.environ.get('PORT', 8030), debug=False)