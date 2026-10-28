# Gera data/taco.csv a partir do PDF da TACO 4a ed. (NEPA/Unicamp).
# Uso: pdftotext -layout taco.pdf taco.txt && python3 scripts/parse-taco-pdf.py taco.txt data/taco.csv
import re, sys, csv, json
lines=open(sys.argv[1],encoding='utf-8').read().split('\n')
start=next(i for i,l in enumerate(lines) if 'Tabela 1. Composição' in l)
end=next(i for i,l in enumerate(lines) if 'Tabela 2. Composição' in l and i>start)
A={};B={};mode=None;group=None;groups={}
GL=['Cereais e derivados','Verduras, hortaliças e derivados','Frutas e derivados','Gorduras e óleos','Pescados e frutos do mar','Carnes e derivados','Leite e derivados','Bebidas','Ovos e derivados','Produtos açucarados','Miscelâneas','Outros alimentos industrializados','Alimentos preparados','Leguminosas e derivados','Nozes e sementes']
num=r'(?:-?\d+(?:,\d+)?[a-z]?|Tr|NA|\*)'
for l in lines[start:end]:
    if 'Descrição dos alimentos' in l: mode='A';continue
    if 'Manganês' in l and 'Sódio' in l:
        mode='B'; k=l.index('Sódio'); scen=k+2.5; continue
    s=l.strip()
    if not s: continue
    m=re.match(r'^(\d+)\s+(.*)$',s)
    if mode=='A':
        if m:
            rest=m.group(2); toks=rest.split()
            # take trailing 12 numeric tokens
            vals=[];
            while toks and re.fullmatch(num,toks[-1]) and len(vals)<11:
                vals.insert(0,toks.pop())
            if len(vals)==11:
                A[int(m.group(1))]=(' '.join(toks),vals,group)
            else:
                parts=re.split(r'\s{2,}',m.group(2).strip())
                name,vals=parts[0],parts[1:]
                idn=int(m.group(1))
                if idn in (387,388,442,537,538,548): vals.insert(7,'NA')
                if idn==472: vals=['NA','216','902','0','0','NA','0','0','Tr','Tr','NA']
                vals=(vals+['NA']*11)[:11]
                A[idn]=(name,vals,group)
        else:
            for G in GL:
                if s.startswith(G): group=G
    elif mode=='B' and m:
        toks=m.group(2).split()
        if all(re.fullmatch(num,t) for t in toks):
            ts=[(t.group(),(t.start()+t.end()-1)/2) for t in re.finditer(r'\S+',l)][1:]
            best=min(ts,key=lambda x:abs(x[1]-scen)) if ts else None
            B[int(m.group(1))]=[best[0] if best and abs(best[1]-scen)<=5 else 'NA']
        else: print('B?',s,file=sys.stderr)
def f(v):
    if v in('Tr',): return 0.0
    if v in('NA','*'): return None
    return float(re.sub('[a-z]$','',v).replace(',','.'))
w=csv.writer(open(sys.argv[2],'w',newline='',encoding='utf-8'))
w.writerow(['taco_id','name','group','base_g','kcal','protein','carbs','fat','fiber','sodium_mg','source','verified','kcal_divergente'])
flags=0
for i in sorted(A):
    name,v,g=A[i]
    kcal,prot,fat,carb,fib=f(v[1]),f(v[3]),f(v[4]),f(v[6]),f(v[7])
    sod=f(B[i][0]) if i in B else None
    calc=4*(prot or 0)+4*max((carb or 0)-(fib or 0),0)+2*(fib or 0)+9*(fat or 0)
    flag= kcal is not None and kcal>20 and abs(calc-kcal)/kcal>0.15
    flags+=flag
    name=re.sub(r'\s+\d$','',name)
    w.writerow([i,name,g,100,kcal,prot,carb,fat,fib,sod,'taco','true','true' if flag else 'false'])
print(len(A),len(B),'flags',flags,'missingB',[i for i in A if i not in B][:20],file=sys.stderr)
