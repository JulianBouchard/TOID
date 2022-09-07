from data_structures import Event

class ISC:

    def __init__(self, budget) -> None:
        self.ordActivities = dict()
        self.countEvs = dict()
        self.d = dict()
        self.budget = budget
        self.b_curr = 0

    def inc_event(self, e) -> None:
        if e in self.countEvs:
            self.countEvs[e]["count"] += 1
        else:
            self.lcb_clean()
            self.countEvs[e] = {"count": 1, "delta": self.b_curr}

    def addPair(self, e1: Event, e2: Event) -> None:
        if (e1.lb, e2.lb, e1.log, e2.log) in self.ordActivities:
            self.ordActivities[(e1.lb, e2.lb, e1.log, e2.log)]["pairs"].append((e1, e2))
            self.ordActivities[(e1.lb, e2.lb, e1.log, e2.log)]["count"] += 1
        else:
            self.lcb_clean()
            self.ordActivities[(e1.lb, e2.lb, e1.log, e2.log)] = {"pairs": [(e1, e2)], "count": 1, "delta": self.b_curr}

    def filterOrd(self, k, y3) -> dict:
        result = dict()

        for (e1Lb, e2Lb, e1Log, e2Log) in self.ordActivities:
            tup = (e1Lb, e2Lb, e1Log, e2Log)
            revTup = (e2Lb, e1Lb, e2Log, e1Log)
            term = self.ordActivities[tup]["count"] / min(self.countEvs[tup[0]]["count"], self.countEvs[tup[1]]["count"])
            if term >= y3:
                
                if revTup not in self.ordActivities:
                    result[tup] = self.ordActivities[tup]["pairs"]
                    continue

                count = self.ordActivities[tup]["count"]
                counttotal = self.ordActivities[revTup]["count"] + count
                
                if count / counttotal <= k:
                    result[tup] = self.ordActivities[tup]["pairs"]

        return result

    def lcb_clean(self):
        if len(self.countEvs) + len(self.d) + len(self.ordActivities) >= self.budget:
            self.b_curr += 1
            while len(self.countEvs) + len(self.d) + len(self.ordActivities) >= self.budget:
                last_size = len(self.countEvs) + len(self.d) + len(self.ordActivities)
                # clean countEvs
                for entry in [*self.countEvs]:
                    if self.countEvs[entry]["count"] + self.countEvs[entry]["delta"] <= self.b_curr:
                        del self.countEvs[entry]
                # clean d
                for entry in [*self.d]:
                    if self.d[entry]["count"] + self.d[entry]["delta"] <= self.b_curr:
                        del self.d[entry]
                # clean DR
                for entry in [*self.ordActivities]:
                    if self.ordActivities[entry]["count"] + self.ordActivities[entry]["delta"] <= self.b_curr:
                        del self.ordActivities[entry]
                # check if no element was removed
                if last_size == len(self.countEvs) + len(self.d) + len(self.ordActivities):
                    # TODO: change to proper increase
                    self.b_curr += 1
