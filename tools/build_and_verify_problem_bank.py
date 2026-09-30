import json
from fractions import Fraction as F
P=[]
def add(id,skill,ctx,q,kind,ans,wrong,**kw):
    P.append(dict(id=id,skill=skill,context=ctx,question=q,answer_type=kind,answer=ans,known_wrong=wrong,**kw))
# S1 ratio meaning
add("r01","S1","class","A class has 12 girls and 16 boys. What is the ratio of girls to boys, in simplest form?","ratio",[3,4],[{"value":[4,3],"tag":"M2"},{"value":[3,7],"tag":"M3"},{"value":[12,28],"tag":"M3"}],simplest=True)
add("r02","S1","fruit","A fruit bowl has 5 apples and 3 oranges. What fraction of all the fruit is apples?","fraction",[5,8],[{"value":[5,3],"tag":"M3"},{"value":[3,8],"tag":"M3"}])
add("r03","S1","smoothie","A smoothie uses 2 cups of strawberries for every 3 cups of yogurt. What is the ratio of yogurt to strawberries?","ratio",[3,2],[{"value":[2,3],"tag":"M2"},{"value":[3,5],"tag":"M3"}],simplest=True)
add("r04","S1","sports","A soccer team won 18 games and lost 6. What is the ratio of wins to total games played, in simplest form?","ratio",[3,4],[{"value":[3,1],"tag":"M3"},{"value":[1,4],"tag":"M3"},{"value":[4,3],"tag":"M2"}],simplest=True)
# S2 equivalent ratios
add("r05","S2","baking","A cookie recipe uses 3 cups of flour for every 2 cups of sugar. How many cups of flour go with 8 cups of sugar?","number",12,[{"value":9,"tag":"M1"},{"value":F(16,3),"tag":"M4"}])
add("r06","S2","art","A paint mix uses 4 cups of blue for every 6 cups of yellow. How many cups of yellow go with 10 cups of blue?","number",15,[{"value":12,"tag":"M1"},{"value":F(20,3),"tag":"M4"}])
add("r07","S2","running","Jada runs 5 laps every 2 minutes. At the same pace, how many minutes does it take her to run 15 laps?","number",6,[{"value":12,"tag":"M1"},{"value":F(75,2),"tag":"M4"}])
add("r08","S2","ratio table","Fill in the missing number so the ratios are equivalent: 6 : 9 = 12 : ?","number",18,[{"value":15,"tag":"M1"},{"value":8,"tag":"M4"}])
# S3 unit rate
add("r09","S3","travel","A car travels 150 miles in 3 hours at a steady speed. How many miles does it travel per hour?","number",50,[{"value":F(1,50),"tag":"M4"},{"value":450,"tag":"M4"}])
add("r10","S3","shopping","A pack of 12 pencils costs $3. How much does one pencil cost, in dollars?","number",F(1,4),[{"value":4,"tag":"M4"},{"value":36,"tag":"M4"}])
add("r11","S3","reading","Maya reads 45 pages in 1.5 hours. How many pages does she read per hour?","number",30,[{"value":F(1,30),"tag":"M4"},{"value":F(135,2),"tag":"M4"},{"value":F(89,2),"tag":"M1"}])
add("r12","S3","printing","A printer prints 84 pages in 7 minutes. At the same rate, how many pages does it print in 12 minutes?","number",144,[{"value":89,"tag":"M1"},{"value":49,"tag":"M4"}])
# S4 percent
add("r13","S4","percent","What is 30% of 60?","number",18,[{"value":2,"tag":"M5"},{"value":200,"tag":"M5"},{"value":30,"tag":"M5"}])
add("r14","S4","survey","18 out of 24 students chose pizza for the class party. What percent of students chose pizza?","number",75,[{"value":F(400,3),"tag":"M5"},{"value":18,"tag":"M5"}])
add("r15","S4","sale","A $40 video game is 25% off. What is the sale price, in dollars?","number",30,[{"value":10,"tag":"partial"},{"value":15,"tag":"M5"}])
add("r16","S4","percent","12 is 20% of what number?","number",60,[{"value":F(12,5),"tag":"M5"},{"value":F(5,3),"tag":"M5"}])
# S5 proportions
add("r17","S5","shopping","4 notebooks cost $10. At the same price each, how much do 10 notebooks cost, in dollars?","number",25,[{"value":16,"tag":"M1"},{"value":4,"tag":"M4"}])
add("r18","S5","maps","On a map, 2 cm stands for 5 km. How many km does 7 cm stand for?","number",F(35,2),[{"value":10,"tag":"M1"},{"value":F(14,5),"tag":"M4"}])
add("r19","S5","algebra","y is proportional to x. When x = 3, y = 12. What is y when x = 5?","number",20,[{"value":14,"tag":"M1"},{"value":F(5,4),"tag":"M4"}])
add("r20","S5","cooking","A soup recipe for 6 people uses 4 cups of broth. How many cups of broth are needed for 9 people?","number",6,[{"value":7,"tag":"M1"},{"value":F(27,2),"tag":"M4"}])

# independent verification of correct answers
checks={"r01":F(12,16)==F(3,4),"r02":F(5,5+3)==F(5,8),"r03":True,"r04":F(18,24)==F(3,4),
"r05":F(3,2)*8==12,"r06":F(6,4)*10==15,"r07":F(2,5)*15==6,"r08":F(9,6)*12==18,
"r09":F(150,3)==50,"r10":F(3,12)==F(1,4),"r11":F(45)/F(3,2)==30,"r12":F(84,7)*12==144,
"r13":F(30,100)*60==18,"r14":F(18,24)*100==75,"r15":40*(1-F(25,100))==30,"r16":F(12)/F(20,100)==60,
"r17":F(10,4)*10==25,"r18":F(5,2)*7==F(35,2),"r19":F(12,3)*5==20,"r20":F(4,6)*9==6}
assert all(checks.values()), [k for k,v in checks.items() if not v]
# distractors must differ from the correct answer
def val(x): return F(x[0],x[1]) if isinstance(x,list) else F(x)
for p in P:
    for w in p["known_wrong"]:
        assert val(w["value"])!=val(p["answer"]) or p["answer_type"]!="number", p["id"]
        if p["answer_type"]!="number": assert val(w["value"])!=val(p["answer"]), p["id"]
def ser(o):
    if isinstance(o,F): return {"num":o.numerator,"den":o.denominator}
    raise TypeError
json.dump(P,open("problem_bank_v1.json","w"),indent=1,default=ser)
print(len(P),"problems verified")
