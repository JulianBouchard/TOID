import copy
import time
import json
from datetime import datetime
from itertools import chain
from ordering_isc import ISC
from data_structures import Alpha_Entry
from heuristicWrapper import Heuristic_LC, Heuristic_LCB
from stream_handler import MessageAnnouncer, format_sse

class Wrapper:

    def __init__(self) -> None:
        self.method = 1
        self.cleanFreq = 1000
        self.iscBudget = 1000
        self.k = 0.05
        self.y3 = 0.99
        self.updateFreq = 50
        self.delay = 2
        self.DAA = dict()
        self.DISC = ISC(self.iscBudget)
        self.running = True
        self.pause = False
        self.stream = []

    def updateParams(self, method, cleanFreq, iscBudget, k, y3, updateFreq, delay) -> None:
        self.method = method
        self.cleanFreq = cleanFreq
        self.iscBudget = iscBudget
        self.k = k
        self.y3 = y3
        self.updateFreq = updateFreq
        self.delay = delay

    def stop(self) -> None:
        self.running = False

    def pause_unpause(self) -> None:
        self.pause = not self.pause

    def reset(self, stream) -> None:
        self.running = True
        self.DAA = dict()
        self.DISC = ISC(self.iscBudget)
        self.running = True
        self.pause = False
        self.stream = stream

    def toJSON(self, errMsg) -> str:
        tLs = list(chain.from_iterable(self.DAA[i].miner.tL for i in self.DAA))
        keys = list(self.DISC.filterOrd(self.k, self.y3).keys())
        filteredKeys = [(x,y,xx,yy) for x,y,xx,yy in keys if x in tLs and y in tLs]

        return json.dumps({"models": [self.DAA[i].prepJSON() for i in self.DAA], "iscLinks": filteredKeys, "errorMsg": errMsg, "timestamp": datetime.now().strftime("%m/%d/%Y, %H:%M:%S")})

    def run(self, MA: MessageAnnouncer, t1, t2, t3, t4) -> None:
        max = len(self.stream)
        n = 0
        while self.running:
            n += 1
            if n == max: break

            while self.pause : time.sleep(0.5)

            # TODO: replace with actual event from stream
            incoming_event = self.stream[n-1]

            # check whether the lifecycle is set to 'start'
            if incoming_event.lc != "start" : continue

            # ALPHA -----------------------------------------------------
            # for the alpha algorithms we must seperate events by log
            if incoming_event.log in self.DAA:
                self.DAA[incoming_event.log].increment()
            else:
                self.DAA[incoming_event.log] = Heuristic_LCB(incoming_event.log, self.cleanFreq, t1, t2, t3, t4) if self.method else Alpha_Entry(incoming_event.log)
            
            self.DAA[incoming_event.log].handleEvent(incoming_event)

            # clean up phase of Lossy Counting:
            if not self.method : self.DAA[incoming_event.log].lossy_clean(self.cleanFreq)

            # /ALPHA ----------------------------------------------------

            # ISC -------------------------------------------------------
            # increment or set the counter for the incoming activity
            self.DISC.inc_event(incoming_event.lb)

            if incoming_event.uid in self.DISC.d:
                tmp = copy.deepcopy(self.DISC.d[incoming_event.uid]["set"])

                for e1Log, e1TS, e1 in tmp:
                    if e1Log != incoming_event.log and e1TS != incoming_event.ts:
                        # add pair to ordA
                        self.DISC.addPair(e1, incoming_event)
                        # replace triple
                        if incoming_event.uid in self.DISC.d:
                            self.DISC.d[incoming_event.uid]["set"].remove((e1Log, e1TS, e1))

                if incoming_event.uid in self.DISC.d:
                    self.DISC.d[incoming_event.uid]["set"].add((incoming_event.log, incoming_event.ts, incoming_event))
            else:
                self.DISC.lcb_clean()
                self.DISC.d[incoming_event.uid] = {"set": {(incoming_event.log, incoming_event.ts, incoming_event)}, "count": 1, "delta": self.DISC.b_curr}

            # /ISC ------------------------------------------------------

            if n % self.updateFreq == 0:
                MA.announce(format_sse(self.toJSON("")))
                time.sleep(self.delay)

        MA.announce(format_sse(self.toJSON("complete")))
            