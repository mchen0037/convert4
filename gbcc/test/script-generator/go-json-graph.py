import csv

ifile  = open('graph-input.csv', "rb")
reader = csv.DictReader(ifile)
ofile  = open('graph-output-json.csv', "wb")
writer = csv.writer(ofile)
for row in reader:
	ofile.write("}, {")
	ofile.write("\n\t\t")
	ofile.write('"name": ')
	ofile.write('"'+row["prim-name"]+'",')
	ofile.write("\n\t\t")
	ofile.write('"actionName": ')
	ofile.write('"'+row["prim-name"]+'",')
	ofile.write('\n\t\t"argTypes": ')
	ofile.write("[")
	a = "-"
	b = '","'
	if (row["input-type"].strip() != ""):
		ofile.write('"')
	ofile.write(row["input-type"].strip().replace("; ",'", "').strip(')').strip('(').replace(a,b))
	if (row["input-type"].strip() != ""):
		ofile.write('"')
	ofile.write("]")

	if (row["output-type"].strip() != ""):
		ofile.write(",\n\t")
		ofile.write('\t"returnType": ')
		ofile.write('"'+row["output-type"].strip().strip(')').strip('(')+'"')

	ofile.write('\n\t')
ifile.close()
ofile.close()

