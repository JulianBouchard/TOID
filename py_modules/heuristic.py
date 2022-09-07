from statistics import mean
from data_structures import Link

class Heuristic:

    def __init__(self, id, depThresh, posThresh, relThresh, andThresh) -> None:
        self.id = id
        self.depThresh = depThresh
        self.posThresh = posThresh
        self.relThresh = relThresh
        self.andThresh = andThresh
        self.DF = dict()
        self.tI = set()
        self.tO = set()
        self.tL = set()
        self.pL = set()
        self.fL = set()

    def update(self, DF, DA) -> None:
        self.DF = DF

        TL = {a for a in DA}
        tI = set()
        tO = set()
        tL = set()
        pL = set()
        fL = set()

        for a in TL:
            if not self.getBackward(a, TL, DA):
                tI.add(a)
            aOutput = self.getForward(a, TL, DA)
            if not aOutput:
                tO.add(a)
                continue
            PA = f"P({a})"
            pL.add(PA)
            aveHeur = mean([self.calcHeuristic(a,x) for z in aOutput for x in z])
            aveInt = mean([DF[(a,x)].intensity for z in aOutput for x in z if (a,x) in DF])
            fL.add(Link(a, PA, aveHeur, aveInt))
            for outputSet in aOutput:
                if len(outputSet) > 1:
                    T = "&".join(list(outputSet))
                    tL.add(T)
                    fL.add(Link(PA, T, self.calcANDHeuristic(a, outputSet[0], outputSet[1]), 1))
                    for c in outputSet:
                        PC = f"P({c}')"
                        fL.add(Link(T, PC, self.calcHeuristic(a, c), DF[(a,c)].intensity))
                        pL.add(PC)
                        fL.add(Link(PC, c, self.calcHeuristic(a, c), DF[(a,c)].intensity))
                if len(outputSet) == 1:
                    c = outputSet[0]
                    cInput = self.getBackward(c, TL, DA)
                    for inputSet in cInput:
                        if a in inputSet:
                            if len(inputSet) > 1:
                                T = "".join(list(inputSet)) + "&"
                                tL.add(T)
                                fL.add(Link(PA, T, self.calcRevANDHeuristic(inputSet[0], inputSet[1], c), 1))
                                PC = f"P({c}')"
                                fL.add(Link(T, PC, self.calcHeuristic(a, c), DF[(a,c)].intensity))
                                pL.add(PC)
                                fL.add(Link(PC, c, self.calcHeuristic(a, c), DF[(a,c)].intensity))
                            if len(inputSet) == 1:
                                if len(cInput) > 1:
                                    PC = f"P({c}')"
                                    fL.add(Link(a, PC, self.calcHeuristic(a, c), DF[(a,c)].intensity))
                                    pL.add(PC)
                                    fL.add(Link(PC, c, self.calcHeuristic(a, c), DF[(a,c)].intensity))
                                    pL.remove(PA)
                                    fL.remove(Link(a, PA, aveHeur, aveInt))
                                if len(cInput) == 1:
                                    fL.add(Link(PA, c, self.calcHeuristic(a, c), DF[(a,c)].intensity))
        
        self.tI = tI
        self.tO = tO
        self.tL = tL.union(TL)
        self.pL = pL.union({"iL_"+str(self.id), "oL_"+str(self.id)})
        self.fL = fL.union({Link("iL_"+str(self.id), x, 1, 1) for x in tI}).union({Link(x, "oL_"+str(self.id), 1, 1) for x in tO})

    def calcHeuristic(self, a, b) -> float:
        # set zero if not seen yet
        if (a,b) in self.DF:
            count_ab = self.DF[(a,b)].freq
        else:
            count_ab = 0
        if (b,a) in self.DF:
            count_ba = self.DF[(b,a)].freq
        else:
            count_ba = 0
        return (count_ab - count_ba) / (count_ab + count_ba + 1)

    def calcANDHeuristic(self, a, b, c) -> float:
        if (b,c) in self.DF:
            count_bc = self.DF[(b,c)].freq
        else:
            count_bc = 0
        if (c,b) in self.DF:
            count_cb = self.DF[(c,b)].freq
        else:
            count_cb = 0
        if (a,b) in self.DF:
            count_ab = self.DF[(a,b)].freq
        else:
            count_ab = 0
        if (a,c) in self.DF:
            count_ac = self.DF[(a,c)].freq
        else:
            count_ac = 0

        return (count_bc + count_cb) / (count_ab + count_ac + 1)

    def calcRevANDHeuristic(self, b, c, a) -> float:
        if (b,c) in self.DF:
            count_bc = self.DF[(b,c)].freq
        else:
            count_bc = 0
        if (c,b) in self.DF:
            count_cb = self.DF[(c,b)].freq
        else:
            count_cb = 0
        if (b,a) in self.DF:
            count_ba = self.DF[(b,a)].freq
        else:
            count_ba = 0
        if (c,a) in self.DF:
            count_ca = self.DF[(c,a)].freq
        else:
            count_ca = 0

        return (count_bc + count_cb) / (count_ba + count_ca + 1)

    def isAND(self, a, b, c) -> bool:
        return self.calcANDHeuristic(a, b, c) > self.andThresh

    def getForward(self, a, TL, DA) -> set:
        aL = set()
        max = (0, set())
        for b in TL:
            h = self.calcHeuristic(a,b)
            if h > max[0]: max = (h, {b})
            if h and h == max[0]: max[1].add(b)
            if h > self.depThresh and DA[b].freq > self.posThresh and (max[0]-abs(h)) < self.relThresh: 
                aL.add(b)
        aL.update(max[1])

        partitioned = set()
        while aL:
            b = aL.pop()
            andPar = {b}
            for c in aL:
                if self.isAND(a, b, c):
                    andPar.add(c)
            partitioned.add(tuple(andPar))
            aL.difference_update(andPar)

        return partitioned

    def getBackward(self, a, TL, DA) -> set:
        aL = set()
        max = (0, set())
        for b in TL:
            h = self.calcHeuristic(b,a)
            if h > max[0]: max = (h, {b})
            if h and h == max[0]: max[1].add(b)
            if h > self.depThresh and DA[b].freq > self.posThresh and (max[0]-abs(h)) < self.relThresh: 
                aL.add(b)
        aL.update(max[1])

        partitioned = set()
        while aL:
            b = aL.pop()
            andPar = {b}
            for c in aL:
                if self.calcRevANDHeuristic(b, c, a) > self.andThresh:
                    andPar.add(c)
            partitioned.add(tuple(andPar))
            aL.difference_update(andPar)

        return partitioned