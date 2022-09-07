import itertools
import queue
from bs4 import BeautifulSoup
from datetime import datetime
from data_structures import Event

def isName(tag):
    return tag["key"] == "concept:name"

def isLC(tag):
    return tag["key"] == "lifecycle:transition"

def getMergedStream(inputFiles, ciID: str):

    def isUID(tag):
        return tag["key"] == ciID

    preObj = [BeautifulSoup(file, "xml").find_all("trace") for file in inputFiles]
    obj = []

    for i in range(0, len(preObj)):
        obj.append([])
        for trace in preObj[i]:
            for event in trace.find_all("event"):
                obj[i].append((event.find(isUID)["value"], event.find(isName)["value"], datetime.strptime(event.date['value'][0:19], "%Y-%m-%dT%H:%M:%S"), event.find(isLC)["value"], i))

    finalLog = [x for x in itertools.chain(*itertools.zip_longest(*obj)) if x is not None]
    sortedFinal = sorted(finalLog, key=lambda e: e[2])

    return [Event(e[0], e[1], e[2], e[3], e[4]) for e in sortedFinal]

# Taken from https://maxhalford.github.io/blog/flask-sse-no-deps/
class MessageAnnouncer:

    def __init__(self):
        self.listeners = []

    def listen(self):
        q = queue.Queue(maxsize=10)
        self.listeners.append(q)
        return q

    def announce(self, msg):
        for i in reversed(range(len(self.listeners))):
            try:
                self.listeners[i].put_nowait(msg)
            except queue.Full:
                del self.listeners[i]

# Modified from https://maxhalford.github.io/blog/flask-sse-no-deps/
def format_sse(data: str):
    return f'data: {data}\n\n'
