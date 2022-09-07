import math
from data_structures import Event
from heuristic import Heuristic

class Heuristic_LC:
    def __init__(self, id, er, t1, t2, t3, t4) -> None:
        self.id = id
        self.er = er
        self.w = math.ceil(1/er)
        self.N = 1
        self.DA = dict()
        self.DC = dict()
        self.DR = dict()
        self.miner = Heuristic(id, t1, t2, t3, t4)

    def increment(self) -> None:
        self.N += 1

    def handleEvent(self, e: Event) -> None:
        b_curr = math.ceil(self.N / self.w)
        if e.lb in self.DA:
            self.DA[e.lb].increment()
        else:
            self.DA[e.lb] = DA_Entry(b_curr - 1)
        # check if this context has been seen before
        if e.uid in self.DC:
            # decay all pairs in DR
            for p in self.DR: self.DR[p].decay()
            # increment the counter of this context
            self.DC[e.uid].increment()
            # construct the (a', a) pair to be added
            pair = (self.DC[e.uid].a, e.lb)
            # check if this pair has already been added
            if (pair in self.DR):
                # if so increment its counter
                self.DR[pair].increment()
            else:
                # if not add the pair and run the heuristic algorithm
                self.DR[pair] = DR_Entry(b_curr - 1)
                self.miner.update(self.DR, self.DA)
            # replace old activity
            self.DC[e.uid].a = e.lb
        else:
            self.DC[e.uid] = DC_Entry(e.lb, b_curr - 1)
            self.miner.update(self.DR, self.DA)

        # perform clean
        if self.N % self.w == 0:
            # clean DC
            for entry in [*self.DC]:
                if self.DC[entry].freq + self.DC[entry].delta <= b_curr:
                    del self.DC[entry]
            # clean DR
            for entry in [*self.DR]:
                if self.DR[entry].freq + self.DR[entry].delta <= b_curr:
                    del self.DR[entry]

    def prepJSON(self) -> dict:
        return({"id": self.id,"places": list(self.miner.pL), "transitions": list(self.miner.tL), "links": [x.getSelf() for x in list(self.miner.fL)]})

class Heuristic_LCB:
    def __init__(self, id, budget, t1, t2, t3, t4) -> None:
        self.id = id
        self.budget = budget
        self.b_curr = 0
        self.N = 1
        self.DA = dict()
        self.DC = dict()
        self.DR = dict()
        self.miner = Heuristic(id, t1, t2, t3, t4)

    def increment(self) -> None:
        self.N += 1

    def handleEvent(self, e: Event) -> None:
        if e.lb in self.DA:
            self.DA[e.lb].increment()
        else:
            # check if space is available, else clean
            self.lcb_clean()
            self.DA[e.lb] = DA_Entry(self.b_curr)
        # check if this context has been seen before
        if e.uid in self.DC:
            # decay all pairs in DR
            for p in self.DR: self.DR[p].decay()
            # increment the counter of this context
            self.DC[e.uid].increment()
            # construct the (a', a) pair to be added
            pair = (self.DC[e.uid].a, e.lb)
            # check if this pair has already been added
            if (pair in self.DR):
                # if so increment its counter
                self.DR[pair].increment()
            else:
                # check if space is available, else clean
                self.lcb_clean()
                # if not add the pair and run the heuristic algorithm
                self.DR[pair] = DR_Entry(self.b_curr)
                self.miner.update(self.DR, self.DA)
            # replace old activity
            self.DC[e.uid].a = e.lb
        else:
            # check if space is available, else clean
            self.lcb_clean()
            self.DC[e.uid] = DC_Entry(e.lb, self.b_curr)
            self.miner.update(self.DR, self.DA)

    def lcb_clean(self):
        if len(self.DA) + len(self.DC) + len(self.DR) >= self.budget:
            self.b_curr += 1
            while len(self.DA) + len(self.DC) + len(self.DR) >= self.budget:
                last_size = len(self.DA) + len(self.DC) + len(self.DR)
                # clean DA
                for entry in [*self.DA]:
                    if self.DA[entry].freq + self.DA[entry].delta <= self.b_curr:
                        del self.DA[entry]
                # clean DC
                for entry in [*self.DC]:
                    if self.DC[entry].freq + self.DC[entry].delta <= self.b_curr:
                        del self.DC[entry]
                # clean DR
                for entry in [*self.DR]:
                    if self.DR[entry].freq + self.DR[entry].delta <= self.b_curr:
                        del self.DR[entry]
                # check if no element was removed
                if last_size == len(self.DA) + len(self.DC) + len(self.DR):
                    # TODO: change to proper increase
                    self.b_curr += 1
        
    def prepJSON(self) -> dict:
        return({"id": self.id,"places": list(self.miner.pL), "transitions": list(self.miner.tL), "links": [x.getSelf() for x in list(self.miner.fL)]})

class DA_Entry:
    # Takes a counter and an activity a
    def __init__(self, delta) -> None:
        self.freq = 1
        self.delta = delta

    def increment(self) -> None:
        self.freq += 1

class DC_Entry:
    # Takes a counter and an activity a
    def __init__(self, a, delta) -> None:
        self.freq = 1
        self.a = a
        self.delta = delta

    def increment(self) -> None:
        self.freq += 1

class DR_Entry:
    def __init__(self, delta) -> None:
        self.freq = 1
        self.delta = delta
        self.intensity = 1

    def increment(self) -> None:
        self.freq += 1
        self.intensity += 0.25
        if self.intensity > 1:
            self.intensity = 1

    def decay(self) -> None:
        self.intensity -= 0.01
        if self.intensity < 0.1:
            self.intensity = 0.1