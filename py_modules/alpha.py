from itertools import chain, combinations

class Alpha:

    def __init__(self, id) -> None:
        self.id = id
        self.tI = set()
        self.tO = set()
        self.tL = set()
        self.pL = list()
        self.yL = list()
        self.fL = list()

    def __repr__(self) -> str:
        return "("+str(self.tL)+",\n("+str(self.pL)+",\n("+str(self.fL)+")"

    def update(self, dF) -> None:
        # alpha algorithm step 1:
        TL = {t for tuple in dF for t in tuple}
        # step 2:
        TI = {x for x in TL if (not any([((y,x) in dF) for y in TL if x!=y]))}
        # step 3:
        TO = {x for x in TL if (not any([((x,y) in dF) for y in TL if x!=y]))}
        # step 4:
        PS = [set(t) for t in powerset(TL)]
        XL = [(ax,bx) for ax in PS for bx in PS if (allCausal(dF, ax, bx) and allChoice(dF, ax) and allChoice(dF, bx))]
        # step 5:
        YL = list(filter(lambda ab: ylFilter(XL, ab), XL))
        # step 6:
        PL = list(map(lambda p: f"P{p}", YL)) + ["iL_"+str(self.id), "oL_"+str(self.id)]
        # step 7:
        FL = [("iL_"+str(self.id), x) for x in TI] \
            + [(x, "oL_"+str(self.id)) for x in TO] \
            + [(at,f"P{(a,b)}") for a,b in YL for at in a] \
            + [(f"P{(a,b)}", bt) for a,b in YL for bt in b]
        # step 8:
        self.tL = TL
        self.tI = TI
        self.tO = TO
        self.pL = PL
        self.yL = YL
        self.fL = FL


def isCausal(dF, a, b) -> bool:
    b1 = (a,b) in dF
    b2 = (b,a) not in dF
    return b1 and b2

def allCausal(dF, ax, bx) -> bool:
    return all([isCausal(dF, a, b) for a in ax for b in bx])

def isChoice(dF, a, b) -> bool:
    b1 = (a,b) not in dF
    b2 = (b,a) not in dF
    return b1 and b2

def allChoice(dF, ax) -> bool:
    return all([isChoice(dF, a, b) for a in ax for b in ax])

# modified from https://docs.python.org/3/library/itertools.html#itertools-recipes
def powerset(iterable):
    "powerset([1,2,3]) --> (1,) (2,) (3,) (1,2) (1,3) (2,3) (1,2,3)"
    s = list(iterable)
    return chain.from_iterable(combinations(s, r) for r in range(1, len(s)+1))

def ylFilter(xs, t) -> bool:
    a, b = t
    return not any([(a.issubset(at) and b.issubset(bt)) for at,bt in xs if (at,bt)!=t])