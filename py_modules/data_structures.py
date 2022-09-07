import math
from statistics import mean
from alpha import Alpha

# A simplified event
class Event:
    def __init__(self, uid, lb, ts, lc, log) -> None:
        self.uid = uid
        self.lb  = lb
        self.ts = ts
        self.lc = lc
        self.log = log

    def __eq__(self, other) -> bool:
        return self.uid == other.uid and self.lb == other.lb and self.ts == other.ts and self.lc == other.lc and self.log == other.log

    def __hash__(self) -> int:
        return hash(str(self.uid) + str(self.ts))

    def __repr__(self) -> str:
        return self.lb+str(self.uid)

# 
class Alpha_Entry:
    def __init__(self, id) -> None:
        self.id = id
        self.i = 1
        self.delta = 0
        self.DC = dict()
        self.DA = dict()
        self.miner = Alpha(id)

    def increment(self) -> None:
        self.i += 1

    # Modified Algorithm 2 code block 5-11
    # Takes an incoming event e
    def handleEvent(self, e) -> None:
        # check if this context has been seen before
        if e.uid in self.DC:
            # decay all pairs in DA
            for p in self.DA: self.DA[p].decay()
            # increment the counter of this context
            self.DC[e.uid].increment()
            # construct the (a', a) pair to be added
            pair = (self.DC[e.uid].a, e.lb)
            # check if this pair has already been added
            if (pair in self.DA):
                # if so increment its counter
                self.DA[pair].increment()
            else:
                # if not add the pair and run the alpha algorithm
                self.DA[pair] = DA_Entry(self.delta)
                self.miner.update({*self.DA})
            # replace old activity
            self.DC[e.uid].a = e.lb
        else:
            # add new entry
            self.DC[e.uid] = DC_Entry(self.delta, e.lb)

    def lossy_clean(self, k) -> None:
        if math.floor(self.i / k) != self.delta:
            # clean DC
            for entry in [*self.DC]:
                if self.DC[entry].counter <= self.delta:
                    del self.DC[entry]
            # clean DA
            for entry in [*self.DA]:
                if self.DA[entry].counter <= self.delta:
                    del self.DA[entry]

            self.delta = math.floor(self.i / k)

    def calcHeuristic(self, a, b) -> float:
        # set zero if not seen yet
        if (a,b) in self.DA:
            count_ab = self.DA[(a,b)].counter
        else:
            count_ab = 0
        if (b,a) in self.DA:
            count_ba = self.DA[(b,a)].counter
        else:
            count_ba = 0
        return (count_ab - count_ba) / (count_ab + count_ba + 1)

    def prepJSON(self) -> dict:
        links = [{"src": "iL_"+str(self.id), "dest": x, "weight": 1, "intensity": 1} for x in self.miner.tI] \
            + [{"src": x, "dest": "oL_"+str(self.id), "weight": 1, "intensity": 1} for x in self.miner.tO]
        for ax,bx in self.miner.yL:
            for a in ax:
                heur = [self.calcHeuristic(a,bb) for bb in bx]
                ints = [self.DA[(a,bb)].intensity for bb in bx if (a,bb) in self.DA]
                weight = 0 if len(heur) == 0 else mean(heur)
                intensity = 0 if len(ints) == 0 else mean(ints)
                links.append({"src": a, "dest": f"P{(ax,bx)}", "weight": weight,"intensity": intensity})
            for b in bx:
                heur = [self.calcHeuristic(aa,b) for aa in ax]
                ints = [self.DA[(aa,b)].intensity for aa in ax if (aa,b) in self.DA]
                weight = 0 if len(heur) == 0 else mean(heur)
                intensity = 0 if len(ints) == 0 else mean(ints)
                links.append({"src": f"P{(ax,bx)}", "dest": b, "weight": weight, "intensity": intensity})
        return {"places": self.miner.pL, "transitions": list(self.miner.tL), "links": links}

# 
class DC_Entry:
    # Takes a counter and an activity a
    def __init__(self, counter, a) -> None:
        self.counter = counter
        self.a = a

    def increment(self) -> None:
        self.counter += 1

#
class DA_Entry:
    # Takes a counter and an activity pair (a,a')
    def __init__(self, counter) -> None:
        self.counter = counter
        self.intensity = 1

    def increment(self) -> None:
        self.counter += 1
        self.intensity += 0.25
        if self.intensity > 1:
            self.intensity = 1

    def decay(self) -> None:
        self.intensity -= 0.01
        if self.intensity < 0.1:
            self.intensity = 0.1

class Link:
    def __init__(self, src, dest, weight, intensity) -> None:
        self.src = src
        self.dest = dest
        self.weight = weight
        self.intesity = intensity

    def __eq__(self, __o: object) -> bool:
        return self.src == __o.src and self.dest == __o.dest and self.weight == __o.weight and self.intesity == __o.intensity

    def __hash__(self) -> int:
        return hash(self.src) + hash(self.dest) + hash(self.weight) + hash(self.intesity)

    def getSelf(self) -> dict():
        return {"src": self.src, "dest": self.dest, "weight": self.weight, "intensity": self.intesity}