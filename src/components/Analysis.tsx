import React from "react";
import { Accordion, Card, CardProps, Flex, Group, Text, Title } from "@mantine/core";
import { AthleteDataProps } from "../Athletes";
import { RadarChart } from "@mantine/charts";
import { BoutAttributes } from "../api/types/objects/bout";
import { AllBoutRelationships } from "../api/types/relationships";
import { ObjectIdentifier } from "../api/types/types";
import FloAPI from "../api/FloAPI";
import { WrestlerObject } from "../api/types/objects/wrestler";

type Ratio = [number, number];

type Bout = ObjectIdentifier & {
	type: "bout";
} & {
	attributes: BoutAttributes;
} & {
	relationships: AllBoutRelationships;
}

type Stats = {
	matches: number;
	wins: number;
	losses: number;
	pins: number;
	techs: number;
	wlRatio: Ratio;
	winPercentage: number;
	quickestWin?: { minutes: number, seconds: number, bout: Bout };
	quickestLoss?: { minutes: number, seconds: number, bout: Bout };
	finishTypes: { type: string, wins: number, losses: number }[];
}

function reduce(frac: Ratio): Ratio {
	let a = frac[0];
	let b = frac[1];
	let c;
	while (b) {
		c = a % b; a = b; b = c;
	}
	return [frac[0] / a, frac[1] / a];
}

export default function Analysis(props: AthleteDataProps & { children?: React.ReactNode } & CardProps) {
	const { wrestlers, bouts, identityPersonId, children } = props;
	const stats = React.useMemo(() => {
		if (wrestlers && bouts) {
			const stats: Stats = {
				matches: 0,
				wins: 0,
				losses: 0,
				pins: 0,
				techs: 0,
				wlRatio: [0, 0],
				winPercentage: 0,
				finishTypes: [],
			};

			bouts.data.forEach(bout => {
				stats.matches++;
				const winner = FloAPI.findIncludedObjectById<WrestlerObject>(bout.attributes.winnerWrestlerId, "wrestler", bouts);

				const isAWin = winner?.attributes.identityPersonId == identityPersonId;

				stats.wins += +isAWin;
				stats.losses += +!isAWin;
				stats.pins += +(isAWin && bout.attributes.winType == "F");
				stats.techs += +(isAWin && bout.attributes.winType == "TF");

				const finish = stats.finishTypes.find(f => f.type == bout.attributes.winType);
				if (finish) {
					finish.wins += +isAWin;
					finish.losses += +!isAWin;

					const time = /(\d?\d?):(\d\d)/.exec(bout.attributes.result);

					if (time && time.length > 1) {
						const minutes = time.length > 2 ? parseInt(time[1]) : 0;
						const seconds = time.length > 2 ? parseInt(time[2]) : parseInt(time[1]);

						const quickest = isAWin ? stats.quickestWin : stats.quickestLoss;

						if (quickest) {
							if (minutes < quickest.minutes || (minutes == quickest.minutes && seconds < quickest.seconds)) {
								quickest.minutes = minutes;
								quickest.seconds = seconds;
								quickest.bout = bout;
							}
						} else {
							stats[isAWin ? "quickestWin" : "quickestLoss"] = { minutes, seconds, bout };
						}
					}
				} else {
					stats.finishTypes.push({ type: bout.attributes.winType, wins: +isAWin, losses: +!isAWin });
				}
			});

			stats.wlRatio = reduce([stats.wins, stats.losses]);
			stats.winPercentage = stats.wins / stats.matches;

			return stats;
		}
	}, [wrestlers, bouts, identityPersonId]);

	return stats ? (
		<Card p="0" bg="var(--mantine-color-body)" bd="1px solid var(--mantine-color-gray-7)" w="100%" mx="lg">
			<Flex gap="lg" py="lg" justify="center" direction="row" wrap="wrap">
				<Group gap={4}>
					<Text fw={600}>Matches:</Text>
					<Text>{stats.matches}</Text>
				</Group>
				<Group gap={4}>
					<Text fw={600}>Wins:</Text>
					<Text c="var(--mantine-win-color)">{stats.wins}</Text>
				</Group>
				<Group gap={4}>
					<Text fw={600}>Losses:</Text>
					<Text c="--mantine-loss-color">{stats.losses}</Text>
				</Group>
				<Group gap={4}>
					<Text fw={600}>Pins:</Text>
					<Text>{stats.pins}</Text>
				</Group>
				<Group gap={4}>
					<Text fw={600}>Techs:</Text>
					<Text>{stats.techs}</Text>
				</Group>
				<Group gap={4}>
					<Text fw={600}>W/L Ratio:</Text>
					<Text c="var(--mantine-win-color)">{stats.wlRatio[0]}</Text>
					<Text>-</Text>
					<Text c="--mantine-loss-color">{stats.wlRatio[1]}</Text>
					<Text c={stats.wlRatio[1] != 0 ? (stats.wlRatio[0] / stats.wlRatio[1] > 1 ? "var(--mantine-win-color)" : "--mantine-loss-color") : "var(--mantine-win-color)"}>({(stats.wlRatio[1] != 0 ? (stats.wlRatio[0] / stats.wlRatio[1]) : stats.wlRatio[0]).toFixed(2)})</Text>
				</Group>
				<Group gap={4}>
					<Text fw={600}>Win Percentage:</Text>
					<Text c={stats.winPercentage > 0.5 ? "var(--mantine-win-color)" : "--mantine-loss-color"}>{(stats.winPercentage * 100).toFixed(1)}%</Text>
				</Group>
				<Group gap={4}>
					<Text fw={600}>Quickest Win:</Text>
					<Text c={stats.quickestWin ? "var(--mantine-win-color)" : "--mantine-loss-color"}>{stats.quickestWin ? (stats.quickestWin.minutes + ":" + ((stats.quickestWin.seconds < 10 ? "0" : "") + stats.quickestWin.seconds)) : "N/A"} {stats.quickestWin ? stats.quickestWin.bout.attributes.winType : ""}</Text>
				</Group>
				<Group gap={4}>
					<Text fw={600}>Quickest Loss:</Text>
					<Text c={stats.quickestLoss ? "--mantine-loss-color" : "var(--mantine-win-color)"}>{stats.quickestLoss ? (stats.quickestLoss.minutes + ":" + ((stats.quickestLoss.seconds < 10 ? "0" : "") + stats.quickestLoss.seconds)) : "N/A"} {stats.quickestLoss ? stats.quickestLoss.bout.attributes.winType : ""}</Text>
				</Group>
			</Flex>
			<Accordion variant="default">
				<Accordion.Item value="Statistics" style={{ borderBottom: "none" }}>
					<Accordion.Control ta="center">
						<Title order={3}>See More</Title>
					</Accordion.Control>
					<Accordion.Panel>
						<RadarChart
							h={300}
							w={300}
							data={stats.finishTypes}
							dataKey="type"
							withPolarAngleAxis
							withPolarRadiusAxis
							series={[
								{ name: "wins", color: "var(--mantine-win-color)", opacity: 0.2 },
								{ name: "losses", color: "--mantine-loss-color", opacity: 0.2 },
							]}
							polarRadiusAxisProps={{
								scale: "sqrt",
							}}
						/>
						{children}
					</Accordion.Panel>
				</Accordion.Item>
			</Accordion>
		</Card>
	) : (
		<Card>
			<Text>Loading...</Text>
		</Card>
	);
}
