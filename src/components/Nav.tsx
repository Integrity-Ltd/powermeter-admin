import { Menubar } from "primereact/menubar";

const Navigation = () => {
	const navlist = [
		{
			label: "Home",
			icon: "pi pi-fw pi-home",
			command: () => {
				window.location.href = "/";
			},
		},
		{
			label: "Statistics",
			icon: "pi pi-fw pi-home",
			command: () => {
				window.location.href = "/statistics";
			},
		},
		{
			label: "Measurements Simple",
			icon: "pi pi-fw pi-home",
			command: () => {
				window.location.href = "/measurements_simple";
			},
		},
		{
			label: "Assets",
			icon: "pi pi-fw pi-calendar",
			command: () => {
				window.location.href = "/assets";
			},
		},
		{
			label: "Powermeter",
			icon: "pi pi-fw pi-calendar",
			command: () => {
				window.location.href = "/powermeter";
			},
		},
		{
			label: "Channels",
			icon: "pi pi-fw pi-calendar",
			command: () => {
				window.location.href = "/channels";
			},
		},
	];

	return (
		<div className="sticky top-0 z-5">
			<header>
				<nav>
					<Menubar model={navlist} />
				</nav>
			</header>
		</div>
	);
};
export default Navigation;
